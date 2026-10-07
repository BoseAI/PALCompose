"""Crea dist/PalCompose.zip con il contenuto del repository (ultimo commit) nella cartella PalCompose/.

Uso:  python tools/build_zip.py
Lo zip contiene solo i file salvati nel commit corrente (git archive): le modifiche non salvate non entrano.
"""
import os
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "dist", "PalCompose.zip")


def main():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    subprocess.check_call(
        ["git", "archive", "--format=zip", "--prefix=PalCompose/", "-o", OUT, "HEAD", "--", ".", ":(exclude)dist"],
        cwd=ROOT)
    print("Creato", OUT, "(%d KB)" % (os.path.getsize(OUT) // 1024))


if __name__ == "__main__":
    main()
