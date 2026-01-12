# Структура контента (ParentGuide)

Контент лежит в:

- `src/content/diagnoses.json`
- `src/content/medications.json`

Приложение специально устроено так, чтобы **контент обновлялся без переписывания кода**:
вы меняете JSON → пересобираете WebApp.

---

## diagnoses.json

Массив объектов `Diagnosis`:

```json
{
  "id": "adhd",
  "title": "СДВГ (синдром дефицита внимания и гиперактивности)",
  "aliases": ["ADHD"],
  "summary": "Короткое описание для родителей.",
  "criteria": ["Упрощённые критерии/признаки…"],
  "whatToAskDoctor": ["Вопросы к врачу…"],
  "evidenceBasedHelp": ["Что реально помогает…"],
  "medications": ["atomoxetine", "ssri_sertraline"],
  "oftenLowEvidence": ["nootropics_generic", "phenibut_note"],
  "redFlags": ["Когда срочно обратиться…"],
  "sources": [
    { "label": "Детская психиатрия². Глава 7 (СДВГ)." },
    { "label": "NICE guideline …", "url": "https://…" }
  ]
}
```

Примечания:
- `medications` и `oftenLowEvidence` — это **id** из `medications.json`.
- `sources.url` — опционально. Если ссылки нет, показываем просто подпись.

---

## medications.json

Массив объектов `Medication`:

```json
{
  "id": "atomoxetine",
  "name": "Атомоксетин",
  "class": "ингибитор обратного захвата норадреналина",
  "whenDiscussed": ["Когда обсуждают…"],
  "monitoring": ["Что мониторить…"],
  "warnings": ["Важные предостережения…"],
  "sources": [{ "label": "Детская психиатрия². Глава 7." }]
}
```

---

## Рекомендация по поддержке версии

Если вы обновляете алгоритмы/таблицы в учебнике, удобно добавлять в `sources`
строку вида:

- `Детская психиатрия². Версия контента: 2026-01-12`

Чтобы в приложении было видно, **какая версия** справочника сейчас внутри.
