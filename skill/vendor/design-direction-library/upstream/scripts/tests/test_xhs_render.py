"""xhs_render.py 的测试：故意做坏的页要被抓住，干净的页不能被冤枉，长卷要切对张数。

运行：python3 -m unittest scripts/tests/test_xhs_render.py -v
"""

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
SCRIPT = HERE.parent / 'xhs_render.py'
FX = HERE / 'fixtures'

try:
    import playwright  # noqa: F401
    HAVE = True
except ImportError:
    HAVE = False


def run(name, out):
    p = subprocess.run([sys.executable, str(SCRIPT), str(FX / name), '--out', out], capture_output=True, text=True, timeout=180)
    return p.returncode, p.stdout + p.stderr


@unittest.skipUnless(HAVE, '没装 playwright')
class XhsRender(unittest.TestCase):
    def test_bad_page_is_caught(self):
        with tempfile.TemporaryDirectory() as d:
            code, out = run('xhs_bad.html', d)
            self.assertEqual(code, 1, out)
            self.assertIn('标签底线', out)            # 24px 标签
            self.assertIn('正文底线', out)            # 34px 多行段落
            self.assertIn('字出了页面', out)
            self.assertIn('字跨第 1 道缝', out)
            self.assertIn('字压字', out)
            self.assertIn('字被别的元素盖住', out)
            self.assertIn('✗ 第01张  字压字', out)
            pngs = sorted(Path(d).glob('*.png'))
            self.assertIn('字和图形挤在一起', out)    # 网格塌成一列压到字
            self.assertEqual(len(pngs), 4)            # 2 页 + 长卷切 2 张
            self.assertTrue((Path(d) / 'sheet.jpg').exists())

    def test_clean_page_passes(self):
        with tempfile.TemporaryDirectory() as d:
            code, out = run('xhs_ok.html', d)
            self.assertEqual(code, 0, out)
            self.assertNotIn('字压字', out)
            self.assertNotIn('盖住', out)
            self.assertEqual(sorted(p.name for p in Path(d).iterdir()), ['01.png', 'sheet.jpg'])   # 不留中间图


if __name__ == '__main__':
    unittest.main()
