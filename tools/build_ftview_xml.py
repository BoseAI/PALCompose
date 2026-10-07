"""Rigenera i display FactoryTalk da importare, per FactoryTalk View SE 13, 14 e 15:

  FTView/v<NN>/WebBrowser/777 - PalCompose.xml  browser Rockwell (SEWebBrowserControl1) + VBA con i file
  FTView/v<NN>/ActiveX/777 - PalCompose.xml     controllo PalCompose.Browser + VBA senza file

Il VBA (VBA/*.vb, VBA/Module1.bas) viene inserito negli export di riferimento in FTView/originale:
  777 - PalCompose.xml          export con il browser Rockwell
  777 - PalCompose_ActiveX.xml  export con il controllo PalCompose.Browser (se presente)
Grafica e oggetti restano quelli degli export.

Uso: python tools/build_ftview_xml.py
"""
import os
import re
import xml.dom.minidom

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VERSIONS = ["13", "14", "15"]
VARIANTS = [
    ("WebBrowser", "FTView/originale/777 - PalCompose.xml", "VBA/ThisDisplay_777_PalCompose.vb"),
    ("ActiveX", "FTView/originale/777 - PalCompose_ActiveX.xml", "VBA/ThisDisplay_777_PalCompose_ActiveX.vb"),
]


def read(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8", newline="") as f:
        return f.read()


def build(variant, template_rel, this_rel):
    src = read(template_rel)
    this_display = read(this_rel)
    module1 = "\r\n".join(l for l in read("VBA/Module1.bas").split("\r\n") if not l.startswith("Attribute VB_Name"))
    for code in (this_display, module1):
        if "]]>" in code:
            raise SystemExit("Il codice VBA contiene ']]>': non puo' stare in un CDATA")

    names = re.findall(r"<!--Item Name:(\w+),", src)
    blocks = list(re.finditer(r"(<vbaCode>\s*<!\[CDATA\[)(.*?)(\]\]>\s*</vbaCode>)", src, re.S))
    if names != ["ThisDisplay", "Module1"] or len(blocks) != 2:
        raise SystemExit("%s: struttura VBA inattesa: %s" % (template_rel, names))

    out = src
    for m, code in reversed(list(zip(blocks, [this_display, module1]))):
        out = out[:m.start(2)] + code.rstrip("\r\n") + "\r\n\r\n" + out[m.end(2):]
    out = re.sub(r"Gfx-SE\d+\.xsd", "Gfx-SE%s.xsd", out)

    for v in VERSIONS:
        rel = "FTView/v%s/%s/777 - PalCompose.xml" % (v, variant)
        path = os.path.join(ROOT, rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8", newline="") as f:
            f.write(out.replace("Gfx-SE%s.xsd", "Gfx-SE%s.xsd" % v))
        xml.dom.minidom.parse(path)   # deve restare XML valido
        print("Generato", rel)


def main():
    for variant, template_rel, this_rel in VARIANTS:
        if not os.path.exists(os.path.join(ROOT, template_rel)):
            print("Manca", template_rel, "-> variante", variant, "non generata")
            continue
        build(variant, template_rel, this_rel)


if __name__ == "__main__":
    main()
