import os, sys
from pathlib import Path
sys.path.insert(0, str(Path(os.environ['TEMP']) / 'visigoths-browser-tools'))
from playwright.sync_api import sync_playwright
sys.stdout.reconfigure(encoding='utf-8')
OUT = Path(__file__).resolve().parents[2] / 'docs' / 'evidence' / 'app-screens'
OUT.mkdir(parents=True, exist_ok=True)
BASE = os.environ.get('SMOKE_BASE', 'http://localhost:3107')
only = sys.argv[1] if len(sys.argv) > 1 else None


def run(p, label, vp):
    browser = p.chromium.launch(channel='chrome', headless=True)
    ctx = browser.new_context(viewport=vp, reduced_motion='reduce')
    page = ctx.new_page()
    errs = []
    page.on('console', lambda m: errs.append(f'console.{m.type}: {m.text[:300]}') if m.type in ('error', 'warning') else None)
    page.on('pageerror', lambda e: errs.append(f'pageerror: {str(e)[:300]}'))

    def shot(name):
        page.wait_for_timeout(700)
        page.screenshot(path=str(OUT / f'{name}-{label}.png'))
        print('shot', name, label, page.url, flush=True)

    def step(name, fn):
        try:
            fn()
        except Exception as e:
            print('FAIL', name, label, str(e)[:400], flush=True)
            try:
                page.screenshot(path=str(OUT / f'FAIL-{name}-{label}.png'))
            except Exception:
                pass

    def goto(path):
        page.goto(BASE + path)
        page.wait_for_load_state('networkidle')

    def ask(q):
        goto('/asistente')
        box = page.get_by_placeholder('Pregunta sobre la ruta…')
        box.fill(q)
        box.press('Enter')
        page.wait_for_timeout(300)
        page.get_by_text('Buscando en las fuentes aprobadas…').wait_for(state='detached', timeout=30000)

    step('home', lambda: (goto('/'), shot('01-home')))
    step('chat-empty', lambda: (goto('/asistente'), shot('02-asistente-empty')))

    def guarr():
        ask('¿Qué es el Tesoro de Guarrazar?')
        shot('03a-asistente-guarrazar')
        page.locator('main button[aria-pressed]').first.click()
        shot('03b-asistente-guarrazar-panel')

    step('guarrazar', guarr)

    def route():
        page.evaluate('localStorage.clear()')
        ask('Medio día en Toledo a pie')
        shot('04a-asistente-plan')
        page.get_by_role('button', name='Proponer esta ruta en mi viaje').first.click()
        page.get_by_role('dialog').wait_for()
        shot('04b-asistente-proposal')
        page.get_by_role('button', name='Aceptar cambio').click()
        shot('04c-asistente-accepted')

    step('route', route)
    for name, path in [('05-mi-viaje', '/mi-viaje'), ('06-mapa', '/mapa'),
                       ('07-lugar-guarrazar', '/lugares/huerta-de-guarrazar'),
                       ('08-ruta-capital', '/rutas/la-capital-de-un-reino')]:
        step(name, lambda path=path, name=name: (goto(path), page.wait_for_timeout(1200), shot(name)))
    for path in ['/', '/asistente', '/mi-viaje', '/mapa', '/guardados', '/rutas',
                 '/lugares/huerta-de-guarrazar', '/rutas/la-capital-de-un-reino']:
        goto(path)
        w = page.evaluate('[document.documentElement.scrollWidth, window.innerWidth]')
        if w[0] > w[1]:
            print('OVERFLOW', label, path, w, flush=True)
    for e in errs:
        print('ERR', label, e, flush=True)
    browser.close()


with sync_playwright() as p:
    for label, vp in [('1440', {'width': 1440, 'height': 1000}), ('390', {'width': 390, 'height': 844})]:
        if only and only != label:
            continue
        run(p, label, vp)
