"""Rigenera i display FactoryTalk da importare (FTView/v13 e FTView/v15) inserendo il VBA
aggiornato (VBA/ThisDisplay_777_PalCompose.vb e VBA/Module1.bas) nell'export originale
FTView/originale/777 - PalCompose.xml. Grafica e oggetti restano quelli originali.

Uso: python tools/build_ftview_xml.py
"""
import os
import re
import xml.dom.minidom

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VERSIONS = ["13", "15"]


def read(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8", newline="") as f:
        return f.read()


def main():
    src = read("FTView/originale/777 - PalCompose.xml")
    this_display = read("VBA/ThisDisplay_777_PalCompose.vb")
    module1 = "\r\n".join(l for l in read("VBA/Module1.bas").split("\r\n") if not l.startswith("Attribute VB_Name"))
    for code in (this_display, module1):
        if "]]>" in code:
            raise SystemExit("Il codice VBA contiene ']]>': non puo' stare in un CDATA")

    names = re.findall(r"<!--Item Name:(\w+),", src)
    blocks = list(re.finditer(r"(<vbaCode>\s*<!\[CDATA\[)(.*?)(\]\]>\s*</vbaCode>)", src, re.S))
    if names != ["ThisDisplay", "Module1"] or len(blocks) != 2:
        raise SystemExit("Struttura VBA dell'export originale inattesa: %s" % names)

    out = src
    for m, code in reversed(list(zip(blocks, [this_display, module1]))):
        out = out[:m.start(2)] + code.rstrip("\r\n") + "\r\n\r\n" + out[m.end(2):]

    for v in VERSIONS:
        rel = "FTView/v%s/777 - PalCompose.xml" % v
        path = os.path.join(ROOT, rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8", newline="") as f:
            f.write(out.replace("Gfx-SE15.xsd", "Gfx-SE%s.xsd" % v))
        xml.dom.minidom.parse(path)   # deve restare XML valido
        print("Generato", rel)


if __name__ == "__main__":
    main()
