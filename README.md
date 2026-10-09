## UAO ENGLISH INTERACTIVE LAB
# Estructura

```text
uao-english-lab/
├── public/
├── src/
│   ├── app/
│   │   ├── layout.tsx            # reemplaza MainLayout + index.html
│   │   ├── page.tsx              # "/"
│   │   ├── not-found.tsx         # 404
│   │   ├── globals.css
│   │   └── desafios/
│   │       └── [challengeId]/
│   │           ├── page.tsx      # "/desafios/:id"
│   │           └── resultado/
│   │               └── page.tsx  # (futuro)
│   ├── components/
│   │   ├── ui/                   # Button, Badge
│   │   └── layout/               # Navbar, Footer
│   ├── features/
│   │   ├── home/                 # Hero, ChallengesSection
│   │   ├── challenges/           # (components, data, types.ts)
│   │   ├── activities/           # (futuro) ActivityHost, EmbeddedActivity
│   │   └── results/              # (futuro) ResultScreen, ResultCard
│   ├── hooks/                    # (futuro)
│   ├── services/                 # (futuro)
│   └── utils/                    # (futuro)
├── next.config.ts
├── .env.example
└── README.md
```

- Se utilizará Tailwind CSS en el proyecto.