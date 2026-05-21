"""Standalone unit test for LayoutSettings + Typst layout emission.

Run from the backend directory:
    PYTHONPATH=. .venv/bin/python tests/test_layout_emit.py
Exits 0 on success, 1 on the first failed assertion.
"""

from app.schemas import LayoutSettings, RenderRequest
from app.services.typst_emit import _build_layout_args, emit_typst
from app.schemas import Contact, ResumeData, Theme


def test_defaults():
    d = LayoutSettings()
    assert d.font_size == 10.0
    assert d.line_spacing == 0.8
    assert d.text_align == "justify"
    assert d.text_direction == "auto"


def test_request_default_layout():
    req = RenderRequest(resume=ResumeData(contact=Contact(firstname="A", lastname="B")))
    assert req.layout == LayoutSettings()


def test_bounds_reject_out_of_range():
    try:
        LayoutSettings(font_size=99.0)
    except Exception:
        pass
    else:
        raise AssertionError("font_size=99 should be rejected by Field bounds")


def test_build_layout_args_emits_only_changed():
    args = _build_layout_args(LayoutSettings())
    assert args == [], f"unchanged layout must emit nothing, got {args}"

    # "justify" is now the default, so a non-default align ("left") must emit.
    args = _build_layout_args(LayoutSettings(font_size=11.5, text_align="left"))
    assert "font-size: 11.5pt" in args
    assert 'text-align: "left"' in args
    assert len(args) == 2, f"only changed knobs should emit, got {args}"


def test_emit_typst_injects_layout():
    resume = ResumeData(contact=Contact(firstname="A", lastname="B"))
    src = emit_typst(resume, Theme.aurora_violet, LayoutSettings(margin_x=2.0))
    assert "margin-x: 2cm" in src
    assert "#show: resume.with(" in src

    src_default = emit_typst(resume, Theme.aurora_violet, LayoutSettings())
    assert "margin-x" not in src_default, "default layout must not emit knobs"


if __name__ == "__main__":
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    for t in tests:
        t()
        print(f"  ok  {t.__name__}")
    print(f"{len(tests)} passed")
