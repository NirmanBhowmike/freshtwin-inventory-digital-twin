#!/usr/bin/env python3
"""Create a small, deterministic, attributed browser catalog from FreshRetailNet-50K.

Run only in CI or a machine with internet and pyarrow/pandas available:
    python -m pip install pyarrow pandas
    python scripts/import_freshretail.py

No invented names, prices, stock counts, or shelf lives are inserted into dataset files.
Every SKU retains its actual anonymized category IDs and one REAL 90-day store series.
Normalized sales remain normalized in JSON (they are never called physical units).
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import sys
from urllib.request import Request, urlopen

DATASET = 'Dingdong-Inc/FreshRetailNet-50K'
REVISION = os.environ.get('FRESHRETAIL_REVISION', 'main')
URL = f'https://huggingface.co/datasets/{DATASET}/resolve/{REVISION}/data/train.parquet'
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'data'
TMP = ROOT / '.freshretail-cache'
FIELDS = ['product_id','store_id','city_id','management_group_id','first_category_id','second_category_id','third_category_id',
          'dt','sale_amount','stock_hour6_22_cnt','discount','activity_flag','holiday_flag']


def download():
    TMP.mkdir(exist_ok=True)
    path = TMP / 'train.parquet'
    if path.exists() and path.stat().st_size > 2_000_000:
        print(f'Using cached {path} ({path.stat().st_size} bytes)', flush=True)
        return path
    req = Request(URL, headers={'User-Agent': 'FreshTwin-AcademicResearch/1.0'})
    print(f'Fetching attributed public train split: {URL}', flush=True)
    with urlopen(req, timeout=180) as response, path.open('wb') as stream:
        while chunk := response.read(2 * 1024 * 1024):
            stream.write(chunk)
    if path.stat().st_size < 2_000_000:
        raise ValueError('Download too small to be the expected dataset.')
    print(f'Received {path.stat().st_size:,} bytes', flush=True)
    return path


def convert(path):
    import pandas as pd
    import pyarrow.parquet as pq
    print('Reading dataset columns...', flush=True)
    df = pq.read_table(path, columns=FIELDS).to_pandas()
    print(f'Loaded {len(df):,} observations', flush=True)
    if len(df) != 4_500_000:
        raise ValueError(f'Unexpected number of training observations: {len(df)}')
    df['valid_open_day'] = ((df['stock_hour6_22_cnt'] == 0) & (df['sale_amount'] > 0)).astype('int8')
    df['stockout_flag'] = (df['stock_hour6_22_cnt']>0).astype('int8')
    grouped = (df.groupby(['product_id','store_id'], sort=False)
        .agg(observations=('sale_amount','size'),uncensored_positive=('valid_open_day','sum'),
             mean_sales=('sale_amount','mean'),stockout_days=('stockout_flag','sum'))
        .reset_index())
    qualified = grouped[grouped['observations'] >= 85].copy()
    qualified = qualified.sort_values(['product_id','uncensored_positive','mean_sales','store_id'],
                                    ascending=[True,False,False,True])
    selected = qualified.drop_duplicates('product_id')[['product_id','store_id']]
    selected_ids = set(zip(selected['product_id'].astype(int),selected['store_id'].astype(int)))
    # Fast vectorized semijoin rather than keeping all 4.5M rows in browser assets.
    selected_df = df.merge(selected, on=['product_id','store_id'], how='inner', validate='many_to_one')
    del df
    selected_df = selected_df.sort_values(['product_id','dt'])
    # Only read hourly 24-vector arrays for the selected ~78K observations, not all 4.5M.
    # This keeps the ingestion memory bounded on free GitHub Actions runners.
    import pyarrow.parquet as pq
    hourly_map = {}
    for batch in pq.ParquetFile(path).iter_batches(columns=['product_id','store_id','dt','hours_sale'], batch_size=8192):
        h = batch.to_pydict()
        for pid, sid, date, hourly in zip(h['product_id'],h['store_id'],h['dt'],h['hours_sale']):
            if (int(pid),int(sid)) in selected_ids:
                hourly_map[(int(pid),int(sid),str(date))] = hourly
    if len(hourly_map) != len(selected_df):
        raise ValueError(f'Hourly history mismatch: {len(hourly_map)} versus {len(selected_df)}.')
    print(f'Selected {len(selected_ids):,} product-store series ({len(selected_df):,} rows)', flush=True)
    if len(selected_ids) < 800:
        raise ValueError('Insufficient distinct products; dataset parsing likely failed.')

    OUT.mkdir(parents=True,exist_ok=True)
    groups = [[] for _ in range(16)]
    catalog = []
    for (pid,sid),part in selected_df.groupby(['product_id','store_id'],sort=True):
        first = part.iloc[0]
        sale = part['sale_amount'].tolist()
        oc = part['stock_hour6_22_cnt'].tolist()
        record = {
            'id':int(pid),'store':int(sid),'city':int(first['city_id']),
            'category':[int(first['management_group_id']),int(first['first_category_id']),
                int(first['second_category_id']),int(first['third_category_id'])],
            'days':len(part),
            'meanSale':round(float(sum(sale)/len(sale)),4),
            'stockoutDays':int(sum(1 for x in oc if x>0)),
            'start':str(part['dt'].iloc[0]),'end':str(part['dt'].iloc[-1]),
            'storeCount':int(grouped.loc[grouped['product_id']==pid,'store_id'].nunique()),
        }
        catalog.append(record)
        rows=[]
        for r in part.itertuples(index=False):
            hr = hourly_map[(int(pid),int(sid),str(r.dt))]
            if hr is None or len(hr)!=24:
                raise ValueError(f'Expected 24 hourly sales values on product {pid}.')
            rows.append([str(r.dt), round(float(r.sale_amount),5), int(r.stock_hour6_22_cnt),
                         round(float(r.discount),4),int(r.activity_flag),int(r.holiday_flag),
                         [round(float(x),5) for x in hr]])
        if not 85<=len(rows)<=90:
            raise ValueError(f'Unexpected series length for product {pid}: {len(rows)}')
        groups[int(pid)%16].append({'id':int(pid),'store':int(sid),'rows':rows})

    for i,rows in enumerate(groups):
        (OUT/f'part-{i:02d}.json').write_text(json.dumps({'series':rows},separators=(',',':')),encoding='utf-8')
    with path.open('rb') as source_file:
        raw_sha = hashlib.file_digest(source_file,'sha256').hexdigest()
    meta = {
       'dataset':DATASET,'datasetRevision':REVISION,'split':'train','license':'CC BY 4.0',
       'source':f'https://huggingface.co/datasets/{DATASET}',
       'datasetVersion':'1.0','rawSha256':raw_sha,
       'trainingRows':4500000,'selectedRows':int(len(selected_df)),
       'samplingRule':'For each product, select the store with the most positive uncensored days, tie-breaking by higher mean normalized sales and lower store ID; minimum 85 observations.',
       'categoryNote':'All category codes and product IDs are anonymized, not product names.',
       'scaleNote':'sale_amount and hours_sale are globally normalized and are not physical units; simulator conversion is separate and configurable.',
       'fields':['date','normalizedSales','stockoutHours_6_22','discountRatio','promotion','holiday','normalizedHourlySales'],
       'catalog':catalog,
    }
    (OUT/'catalog.json').write_text(json.dumps(meta,separators=(',',':')),encoding='utf-8')
    if len(catalog)!=len(set(x['id'] for x in catalog)):
        raise AssertionError('Duplicate product entries')
    if len(catalog)<800:
        raise AssertionError('Insufficient distinct products')
    print(f'Wrote {len(catalog)} actual anonymized SKU histories, 16 browser shards and catalog.',flush=True)
    for f in sorted(OUT.glob('*.json')): print(f'{f.name}: {f.stat().st_size:,} bytes',flush=True)

if __name__=='__main__':
    convert(download())