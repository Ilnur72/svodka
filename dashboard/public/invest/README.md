# Loyiha maydoni suratlari

Bu papkaga investitsiya loyihalarining **maydon surati** qo'yiladi. Dashboard'da
ular «Инвестиция лойиҳалари» → «Паспорт» ko'rinishining markazidagi
**«Лойиҳа майдони»** blokida chiziladi.

Surat qo'lda qo'yiladi: reyestrda na koordinata, na xarita, na geologik ma'lumot
bor — shuning uchun dashboard hech narsa chizmaydi va suratning ustiga hech narsa
qo'ymaydi. Qanday fayl qo'ysangiz, ekranda o'shani ko'rasiz.

## Fayl nomlari

Fayl nomi loyihaning ichki kaliti bilan **aynan** bir xil bo'lishi shart, kengaytmasi
`.jpg`. Nom katta-kichik harfga sezgir (`molibdenGmc.jpg` — `G` katta harf).

| Fayl | Loyiha | Hudud |
|---|---|---|
| `miskon.jpg` | "Мискон" мис-порфирли конини ўзлаштириш | Тошкент вилояти Пискент тумани |
| `molibdenGmc.jpg` | Молибден куйиндисини қайта ишлаш бўйича янги гидрометаллургия цехини қуриш | Тошкент вилояти Оҳангарон тумани |
| `kukun.jpg` | Кукун металллургияси асосида деталлар ишлаб чиқаришни ташкил этиш | Тошкент вилояти Оҳангарон тумани |
| `ingichka.jpg` | "Ингичка" конида волфрам чиқиндиларини қайта ишлаш ҳажмини кенгайтириш | Самарқанд вилояти Каттақўрғон тумани |
| `sarikul.jpg` | "Сарикўл" волфрам конини ўзлаштириш | Самарқанд вилояти Нуробод тумани |
| `volframGmc.jpg` | Волфрам концентратини қайта ишлаш янги гидрометалллургия цехини қуриш | Самарқанд вилояти Нуробод тумани |
| `sulfat.jpg` | Сульфат кислотаси ишлаб чиқариш | Навоий вилояти Кармана тумани |

Jami 7 ta fayl. Ularning hammasi majburiy emas — qaysi biri qo'yilsa, o'sha
loyihada surat ko'rinadi.

## O'lcham va format

| Talab | Qiymat |
|---|---|
| Nisbat | **16:10** — barcha loyihada bir xil |
| Tavsiya etilgan o'lcham | **1600 × 1000 px** |
| Eng kichik o'lcham | 1200 × 750 px |
| Format | JPEG (`.jpg`) |
| Fayl hajmi | 500 KB gacha |

Nisbat 16:10 dan farq qilsa surat qirqiladi (`object-cover`) — markazi saqlanadi,
chetlari kesiladi. Shuning uchun muhim joyi kadr markazida turgani ma'qul.

## Surat bo'lmasa nima bo'ladi

Hech narsa buzilmaydi. Fayl topilmasa blok o'rnida xotirjam
**«Сурат юкланмаган»** plashkasi turadi, singan rasm ikonkasi ko'rinmaydi, va
surat ostidagi ko'rsatkichlar (loyiha maydoni, hudud, obyekt turi, qayta ishlash
quvvati) baribir reyestrdan olinib chiziladi.

## Qayerga tushadi

Bu papka `public/` ichida, ya'ni fayllar bundle'ga kirmaydi — build paytida
`dist/invest/` ga o'zgarishsiz ko'chiriladi. Shu sababli surat qo'shish yoki
almashtirish uchun kodga tegish shart emas, faqat faylni shu yerga qo'ying va
qayta build qiling.

Fayllar `.gitignore` da emas — ular repozitoriyga tushishi kerak.
