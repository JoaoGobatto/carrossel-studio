#!/usr/bin/env python3
"""
CARTAO DE PREVIA, PASSO 2: producao/og.png -> assets/og.jpg
==============================================================================
O PNG do Chromium sai com 560 kB. Servico de previa (WhatsApp, Telegram,
LinkedIn, Slack) tem teto de download e alguns desistem no meio, e a previa
some sem erro nenhum. JPEG de qualidade 86 fica perto de 100 kB com a mesma
leitura na tela do celular.

    node producao/og.mjs && python3 producao/og.py

Precisa do Pillow:  pip install Pillow
"""
from pathlib import Path
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
ENTRADA = RAIZ / 'producao' / 'og.png'
SAIDA = RAIZ / 'assets' / 'og.jpg'
QUALIDADE = 86

if not ENTRADA.exists():
    raise SystemExit('nao achei ' + str(ENTRADA) + ' — rode antes: node producao/og.mjs')

img = Image.open(ENTRADA)
if img.size != (1200, 630):
    raise SystemExit('o cartao saiu em %dx%d, esperado 1200x630' % img.size)

# O papel do site nao tem transparencia, mas o PNG vem em RGBA: sem o achatar
# contra o proprio papel o JPEG pinta o alfa de preto nas bordas arredondadas.
if img.mode in ('RGBA', 'LA', 'P'):
    fundo = Image.new('RGB', img.size, '#f7f6f3')
    img = img.convert('RGBA')
    fundo.paste(img, mask=img.split()[-1])
    img = fundo
else:
    img = img.convert('RGB')

img.save(SAIDA, 'JPEG', quality=QUALIDADE, optimize=True, progressive=True)
print('gravado  assets/og.jpg  %d x %d  %.0f kB' % (*img.size, SAIDA.stat().st_size / 1024))
