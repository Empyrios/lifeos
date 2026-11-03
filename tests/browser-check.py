"""Chromium smoke checks using in-memory ES module loading (no localhost network access)."""
from pathlib import Path
import base64,json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
def dataurl(text):return 'data:text/javascript;base64,'+base64.b64encode(text.encode()).decode()
core=dataurl((root/'site/core.mjs').read_text())
app=(root/'site/app.mjs').read_text().replace("'./core.mjs'",repr(core))
index=(root/'site/index.html').read_text()
index=index.replace('<link rel="manifest" href="./manifest.webmanifest">','')
index=index.replace('<link rel="stylesheet" href="./styles.css">','<style>'+(root/'site/styles.css').read_text()+'</style>')
icon='data:image/svg+xml;base64,'+base64.b64encode((root/'site/icons/icon.svg').read_bytes()).decode()
index=index.replace('./icons/icon.svg',icon)
shim="""<script>window.__lifeosMemory={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem(k){return Object.prototype.hasOwnProperty.call(window.__lifeosMemory,k)?window.__lifeosMemory[k]:null},setItem(k,v){window.__lifeosMemory[k]=String(v)},removeItem(k){delete window.__lifeosMemory[k]}}});</script>"""
index=index.replace('<script type="module" src="./app.mjs"></script>',shim+'<script type="module">'+app+'</script>')
with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  for name,width,height in [('mobile',390,844),('desktop',1440,900)]:
   ctx=browser.new_context(viewport={'width':width,'height':height},accept_downloads=True)
   page=ctx.new_page();errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
   page.set_content(index,wait_until='load');page.locator('.hero').wait_for(timeout=15000)
   assert page.title()=='LifeOS · Personal Command Centre'
   assert page.get_by_text('Make today').count()>=1
   page.screenshot(path=str(root/f'preview-{name}.png'),full_page=True)
   # Add a project from desktop navigation, or access via Data > sidebar-only link on mobile.
   if name=='desktop':
    page.locator('.sidebar [data-page="projects"]').click()
    page.get_by_role('button',name='New project').click()
    page.locator('input[name="name"]').fill('Weave research')
    page.locator('textarea[name="description"]').fill('v0.2 release planning')
    page.locator('.modal-form button[type="submit"]').click()
    assert page.get_by_text('Weave research').count()>=1
    # task with linked project
    page.locator('.topbar [data-action="new-task"]').click()
    page.locator('input[name="title"]').fill('Run 1000 matches')
    page.locator('select[name="projectId"]').select_option(label='Weave research')
    page.locator('input[name="estimate"]').fill('90')
    page.locator('.modal-form button[type="submit"]').click()
    page.locator('.sidebar [data-page="tasks"]').click()
    assert page.get_by_text('Run 1000 matches').count()>0
    page.locator('.task-card [data-action="toggle-task"]').first.click()
    page.locator('[data-filter="done"]').click()
    assert page.get_by_text('Run 1000 matches').count()>0
    assert 'Run 1000 matches' in page.evaluate("localStorage.getItem('empyrios-lifeos-v1')")
    # goals and progress
    page.locator('.sidebar [data-page="goals"]').click()
    page.get_by_role('button',name='New goal').click()
    page.locator('input[name="title"]').fill('Build £10000 buffer')
    page.locator('input[name="target"]').fill('10000')
    page.locator('input[name="current"]').fill('2500')
    page.locator('.modal-form button[type="submit"]').click()
    assert page.get_by_text('Build £10000 buffer').count()==1
    page.get_by_role('button',name='Log progress').click()
    page.locator('input[name="current"]').fill('4500')
    page.locator('.modal-form button[type="submit"]').click()
    assert page.get_by_text('45% complete').count()==1
    # block planner
    page.locator('.sidebar [data-page="planner"]').click()
    page.get_by_role('button',name='Time block',exact=True).click()
    page.locator('input[name="title"]').fill('Deep Work')
    page.locator('.modal-form button[type="submit"]').click()
    assert page.get_by_text('Deep Work').count()>0
    page.locator('.sidebar [data-page="review"]').click()
    page.locator('#review-text').fill('Shipping progress and caveats.')
    page.locator('form[data-submit="review"] button[type="submit"]').click()
    assert page.locator('#review-text').input_value()=='Shipping progress and caveats.'
    # exports
    page.locator('.sidebar [data-page="data"]').click()
    with page.expect_download() as out: page.locator('[data-action="export-json"]').click()
    download=out.value
    assert download.suggested_filename.startswith('lifeos-backup-')
    with page.expect_download() as out: page.locator('[data-action="export-csv"]').click()
    assert out.value.suggested_filename.startswith('lifeos-tasks-')
   else:
    # Mobile task capture and navigation
    page.locator('.topbar [data-action="new-task"]').click()
    page.locator('input[name="title"]').fill('Test mobile capture')
    page.locator('.modal-form button[type="submit"]').click()
    page.locator('.mobile-nav [data-page="tasks"]').click()
    assert page.get_by_text('Test mobile capture').count()==1
    page.locator('.mobile-nav [data-page="planner"]').click()
    assert page.get_by_text('Weekly planner').count()>=1
    page.locator('.mobile-nav [data-page="data"]').click()
    assert page.get_by_text('Your other apps').count()==1
    page.locator('.mobile-shortcuts [data-page="projects"]').click()
    assert page.locator('.page-heading h1').inner_text()=='Projects'
    page.locator('.mobile-nav [data-page="data"]').click()
    page.locator('.mobile-shortcuts [data-page="review"]').click()
    assert page.locator('.page-heading h1').inner_text()=='Weekly review'
    # Home again and browser navigation shortcut
    page.locator('.mobile-nav [data-page="today"]').click()
    page.keyboard.press('n')
    assert page.locator('.dialog-panel').count()==1
    page.keyboard.press('Escape')
    assert page.locator('.dialog-panel').count()==0
   measurements=page.evaluate('({width:document.documentElement.scrollWidth,viewport:innerWidth})')
   assert measurements['width']<=measurements['viewport']+1,measurements
   assert not errors, errors
   print(name,'PASS',measurements,'page errors',len(errors))
   ctx.close()
  browser.close()

