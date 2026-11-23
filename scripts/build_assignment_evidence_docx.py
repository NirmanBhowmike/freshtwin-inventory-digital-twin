"""Create a two-page technical evidence DOCX from real FreshTwin screenshots.

Instructor's instructions require the student to write their own discussion. This is a
reproducible working draft/evidence pack, for personal review and rewriting.
"""
from __future__ import annotations
import json, subprocess, os
from pathlib import Path
from PIL import Image
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'.demo-artifacts'
OUT.mkdir(exist_ok=True)

def get_stats():
    cmd=["node","--input-type=module","-e", "import {VEGETABLES} from './src/vegetables.js';import {jointMonteCarlo} from './src/joint.js';console.log(JSON.stringify(jointMonteCarlo(VEGETABLES,{},42,12))); "]
    return json.loads(subprocess.run(cmd,cwd=ROOT,capture_output=True,text=True,check=True).stdout)


def cropped_image(name,top=0,bottom=650):
    path=OUT/name
    if not path.is_file():
        raise FileNotFoundError(f'Actual live-page screenshot is absent: {path}')
    image=Image.open(path).convert('RGB')
    width,height=image.size
    result=OUT/(name.replace('.png','-report-crop.png'))
    image.crop((0,top,width,min(height,bottom))).save(result,optimize=True)
    return result


def set_repeat_table_header(row):
    trpr=row._tr.get_or_add_trPr();tag=OxmlElement('w:tblHeader');tag.set(qn('w:val'),'true');trpr.append(tag)


def ptext(doc,text,bold_start=None,after=4):
    p=doc.add_paragraph();p.paragraph_format.space_after=Pt(after)
    if bold_start and text.startswith(bold_start):p.add_run(bold_start).bold=True;p.add_run(text[len(bold_start):])
    else:p.add_run(text)
    return p


def title(doc,text,size=12,before=8,after=5):
    p=doc.add_paragraph();p.paragraph_format.space_before=Pt(before);p.paragraph_format.space_after=Pt(after)
    r=p.add_run(text);r.bold=True;r.font.size=Pt(size);r.font.color.rgb=RGBColor(33,72,57)
    return p


def caption(doc,text):
    p=doc.add_paragraph();p.alignment=WD_ALIGN_PARAGRAPH.CENTER;p.paragraph_format.space_before=Pt(4);p.paragraph_format.space_after=Pt(5)
    r=p.add_run(text);r.italic=True;r.font.size=Pt(8);r.font.color.rgb=RGBColor(87,97,90)


def main():
    stats=get_stats();results=stats['byPolicy'];doc=Document()
    sec=doc.sections[0];sec.page_height=Inches(11);sec.page_width=Inches(8.5);sec.top_margin=Inches(.62);sec.bottom_margin=Inches(.56);sec.left_margin=Inches(.75);sec.right_margin=Inches(.75)
    styles=doc.styles;normal=styles['Normal'];normal.font.name='Aptos';normal.font.size=Pt(9.3);normal.paragraph_format.space_after=Pt(4);normal.paragraph_format.line_spacing=1.08
    header=sec.header.paragraphs[0];header.alignment=WD_ALIGN_PARAGRAPH.RIGHT;header.add_run('INEN-5350-48F | Production & Inventory Control').italic=True;header.runs[0].font.size=Pt(8)
    foot=sec.footer.paragraphs[0];foot.alignment=WD_ALIGN_PARAGRAPH.CENTER
    rr=foot.add_run('FreshTwin research discussion worksheet | Student review required | Page ');rr.font.size=Pt(8)
    fld=OxmlElement('w:fldSimple');fld.set(qn('w:instr'),'PAGE');foot._p.append(fld)
    p=doc.add_paragraph();p.alignment=WD_ALIGN_PARAGRAPH.CENTER;p.paragraph_format.space_after=Pt(2)
    x=p.add_run('Intelligent Fresh-Food Inventory Digital Twin');x.bold=True;x.font.size=Pt(14)
    p=doc.add_paragraph('Stockout-Aware Demand Estimation and Stochastic Replenishment Optimization');p.alignment=WD_ALIGN_PARAGRAPH.CENTER;p.paragraph_format.space_after=Pt(6)
    p=doc.add_paragraph();p.alignment=WD_ALIGN_PARAGRAPH.CENTER;p.paragraph_format.space_after=Pt(6)
    p.add_run('Dr. James Curry  |  Nirman Bhowmike  |  November 2026').italic=True
    title(doc,'Problem and doctoral-level extension',size=10,before=5)
    ptext(doc,'The project studies a practical production and inventory control problem: a retailer may underestimate demand when recorded sales are limited by stockouts. Fresh products also expire, so increased inventory can improve service while raising waste and storage requirements. FreshTwin compares a recorded-sales reorder rule, a stockout-adjusted reorder rule and a coupled multi-product decision model. The extension adds ten vegetables with different shelf lives, lead times and assumed unit economics, all competing for one purchasing budget and one refrigerated-storage limit.',after=5)
    img=cropped_image('02_joint_hero.png',bottom=575);doc.add_picture(str(img),width=Inches(6.95));caption(doc,'Figure 1. FreshTwin joint-store laboratory captured from the public application.')
    title(doc,'Model design and AI-assisted implementation',size=10,before=4)
    ptext(doc,'Each day, due shipments arrive, demand is served first-expiring-first-out (FEFO), unsold cohorts age and expired units are discarded. The model then selects nonnegative integer orders. It enforces a horizon-wide capital constraint and conservatively reserves refrigerated space for on-hand stock plus outstanding orders. The coupled algorithm uses sampled demand paths and marginal order-value comparisons. AI assisted development of the interface and solver; I separated that implementation work from mathematical verification and reproducible testing.',after=2)
    title(doc,'Operational constraints and evaluation criterion',size=10,before=6)
    ptext(doc,'For vegetable i on day t, the stock balance is I(i,t+1) = I(i,t) + receipts(i,t) - fulfilled demand(i,t) - expired(i,t). Purchasing commitments over the horizon cannot exceed the shared budget B, while reserved volume for on-hand and outstanding orders cannot exceed capacity C at any simulated decision. The reported net scenario cost is the cost of opening assets and purchases, less usable terminal assets, plus holding, disposal and unmet-demand penalties. This accounting avoids making late-period orders appear expensive solely because they have not yet arrived. The allocator is a bounded heuristic rather than a globally optimal multi-period solution.',after=2)
    doc.add_page_break()
    title(doc,'Results and interpretation',size=11,before=4)
    ptext(doc,'For the default illustrative 21-day scenario, the purchasing budget is $5,500 and reserved capacity is 310 volume units. Twelve paired Monte Carlo trials use a common demand path across policies within each trial. These are modeled costs, not observed retailer earnings.',after=6)
    table=doc.add_table(rows=1,cols=4);table.style='Table Grid';table.alignment=WD_TABLE_ALIGNMENT.CENTER
    for cell,val in zip(table.rows[0].cells,['Policy','Modeled cost','Fill rate','Expired units']):cell.text=val
    set_repeat_table_header(table.rows[0]);labels=[('sales','Sales baseline'),('corrected','Stockout adjusted'),('joint','Joint coupled')]
    for key,label in labels:
        item=results[key];row=table.add_row();
        for cell,val in zip(row.cells,[label,f"${item['cost']:,.2f}",f"{item['fillRate']*100:.1f}%",f"{item['expired']:.1f}"]):cell.text=val;cell.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
    for row in table.rows:
        for c in row.cells:
            for p in c.paragraphs:
                for run in p.runs:run.font.size=Pt(8.6)
    caption(doc,'Table 1. Mean results from 12 seeded, matched simulations (illustrative parameters).')
    img=cropped_image('05_capacity_chart.png',bottom=650);doc.add_picture(str(img),width=Inches(6.95));caption(doc,'Figure 2. Refrigerated-space feasibility trace in the joint-stock experiment.')
    ptext(doc,'The joint policy produces a higher mean fill rate than the recorded-sales policy, but it also has a higher modeled total cost and more expired units. This result is not an optimizer failure. It reveals the trade-off between additional customer service and operating cost under the assumed penalties. The capacity and budget remain feasible in each simulated decision. A small-instance exhaustive solver, 42 automated tests and browser-level acceptance checks support implementation quality, but they do not establish global optimality for the ten-item policy.',after=5)
    title(doc,'Limitations and references',size=10,before=4)
    ptext(doc,'The FreshRetailNet-50K benchmark preserves 865 anonymized product identifiers and real normalized sales and stockout signals, but does not identify vegetable names or report actual shelf life, purchase cost or physical stock. The named vegetable store is therefore a separate transparent simulation. Real-world validation needs measured receipts, inventory age, unit costs and independent demand calibration.',after=3)
    ptext(doc,'Wang, Y., et al. (2025). FreshRetailNet-50K: A stockout-annotated censored demand dataset. arXiv:2505.16319. https://arxiv.org/abs/2505.16319',after=2)
    ptext(doc,'Sharma, S., Abouee-Mehrizi, H., & Sartor, G. (2020). Inventory management under storage and order restrictions. Production and Operations Management, 29(1). https://doi.org/10.1111/poms.13097',after=1)
    file=OUT/'FreshTwin_Quick_AI_Assignment_Two_Page_Review_Draft.docx';doc.save(file)
    print(file)

if __name__=='__main__':main()