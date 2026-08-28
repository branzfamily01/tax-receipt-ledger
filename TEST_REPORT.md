# Test Report

Tested 2026-08-28.

## Core app

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
- Browser JavaScript runtime errors during normal UI test: none

## v1.1 vFlat PDF batch import

- vFlat PDF mode UI: PASS
- Mobile viewport horizontal overflow: none
- 2-page PDF simulation -> 2 receipt candidates: PASS
- 1 page -> 1 JPEG Blob conversion path: PASS
- Page range controls: PASS
- Batch defaults for income type / category / payment / business-use percentage: PASS
- Imported records remain `confirmed: false` / 「要確認」: PASS
- Generated image names `p001.jpg`, `p002.jpg`: PASS
- JavaScript syntax check for `pdf-import.js`: PASS
- PWA app-shell cache updated for `pdf-import.js` / `pdf-import.css`: PASS
- `manual.html` updated for PDF workflow: PASS

OCR and PDF.js CDN downloads were not exercised against the live CDN inside the sandbox because external network access is restricted there. The batch import logic was tested with a simulated PDF document. On first real use, PDF.js and (when OCR is enabled) Tesseract.js require network access to load their engines.
