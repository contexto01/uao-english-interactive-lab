## UAO English Interactive Lab

Base inicial para una plataforma de desafíos educativos de Inglés 5 de la Universidad Autónoma de Occidente.

### Estructura actual

```text
uao-english-interactive-lab/
├── public/
├── src/
│   ├── app/
│   │   ├── layout.tsx            # Layout raíz, metadata y estructura global
│   │   ├── page.tsx              # Página principal
│   │   ├── not-found.tsx         # Página 404
│   │   ├── globals.css
│   │   └── desafios/
│   │       └── [challengeId]/
│   │           ├── page.tsx      # Detalle de un desafío
│   │           └── resultado/
│   │               └── page.tsx  # Placeholder de resultados
│   ├── components/               # Componentes reutilizables
│   │   ├── ui/                   # Button, Badge
│   │   └── layout/               # Navbar, Footer
│   └── features/                 # Funcionalidades organizadas por dominio
│       ├── home/                 # Hero, desafíos y cómo funciona
│       └── challenges/            # Tipos y datos de desafíos
├── next.config.ts
└── README.md
```

### Tecnologías

- Next.js con App Router
- TypeScript
- Tailwind CSS 4
- React Server Components por defecto

### Comandos

```bash
npm run dev
npm run lint
npm run build
```

Las actividades, resultados reales e integraciones externas se incorporarán progresivamente.
