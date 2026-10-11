<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Verzia aplikácie

Verzia je v `src/lib/version.ts` a odvodzuje sa z GitHub mergov: 1.0.0 = pôvodný
projekt, každý PR zmergnutý do `main` = +1 minor. Každý nový PR pridá navrch
`RELEASES` záznam s ďalšou verziou (a zladí `version` v `package.json`).
