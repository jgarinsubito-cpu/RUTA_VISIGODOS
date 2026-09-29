"""Capture public Mindtrip UI in an isolated browser; no personal browser profile."""
import json
import os
from pathlib import Path
import sys

sys.path.insert(0, str(Path(os.environ['TEMP']) / 'visigoths-browser-tools'))
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
out = Path(__file__).parent.parent / 'mindtrip'
out.mkdir(exist_ok=True)
recipe = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    context = browser.new_context(viewport=recipe.get('viewport', {'width':1440,'height':1000}))
    page = context.new_page()
    page.on('pageerror', lambda err: print(json.dumps({'page_error':str(err)[:1000]}),flush=True))
    page.on('requestfailed', lambda req: print(json.dumps({'request_failed':req.url.split('?')[0],'reason':req.failure}),flush=True))
    for step in recipe['steps']:
        try:
            if 'url' in step:
                page.goto(step['url'], wait_until='domcontentloaded', timeout=45000)
            if 'click' in step:
                page.locator(step['click']).first.click(timeout=10000)
            if 'fill' in step:
                page.locator(step['fill'][0]).first.fill(step['fill'][1])
            if 'press' in step:
                page.locator(step['press'][0]).first.press(step['press'][1])
            page.wait_for_timeout(step.get('wait',3500))
            name = step['name']
            page.screenshot(path=str(out/(name+'.png')), full_page=False)
            snapshot = page.locator('body').aria_snapshot()
            (out/(name+'.txt')).write_text(snapshot,encoding='utf-8')
            print(json.dumps({'name':name,'url':page.url,'snapshot':snapshot[:step.get('limit',15000)]},ensure_ascii=False),flush=True)
        except Exception as e:
            print(json.dumps({'error':str(e),'step':step},ensure_ascii=False),flush=True)
    browser.close()
