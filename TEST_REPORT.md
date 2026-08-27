# Test Report

Tested 2026-08-28.

- iPhone-class viewport: 390 x 844
- Manual entry -> save: PASS
- Business-use percentage calculation: PASS
- Edit existing receipt: PASS
- Category summary: PASS
- CSV export: PASS
- XLSX export: PASS
- Generated XLSX re-opened with `openpyxl`: PASS
- XLSX sheets: 経費台帳 / 科目別集計 / 月別集計
- Image-inclusive JSON backup generation: PASS
- `manual.html` mobile rendering: PASS
- Browser JavaScript runtime errors during UI test: none

OCR was not exercised in the sandbox because its model is fetched from an external CDN at first use. The app remains fully usable without OCR.
