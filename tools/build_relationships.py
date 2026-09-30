#!/usr/bin/env python3
"""Regenerate docs/RELATIONSHIPS.md from the content files: written medication reviews and specialist priorities.

Usage:  python3 tools/build_relationships.py
"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
C = ROOT / 'webapp/src/content'
load = lambda name: json.loads((C / name).read_text())
dx = {d['id']: d for d in load('diagnoses.json') if d.get('kind') != 'group'}
meds = {m['id']: m for m in load('medications.json')}
guides = load('treatment-guides.json')
plans = load('nonpharm-support.json')
specs = {s['id']: s for s in load('specialists.json')}
pairs = load('pair-context.json')
version = load('meta.json')['appVersion']
KIND = {'condition': 'Помогает при этом состоянии', 'specialist': 'По особым показаниям', 'cooccurring': 'При сопутствующей проблеме',
        'limited': 'Польза не доказана', 'not_recommended': 'Не рекомендуется', 'safety': 'Побочные эффекты и безопасность'}
RULE = {'limited': 'Польза не доказана', 'not_recommended': 'Не рекомендуется', 'offlabel': 'Не основное лечение', 'other': 'Назначают по другому поводу'}
cell = lambda s: s.replace('|', '/').replace('\n', ' ')
name = lambda d: d.get('shortTitle') or d['title']
clinical = [d for d in dx.values() if not d.get('topicKind') or d['topicKind'] == 'diagnosis']
drugs = [m for m in meds.values() if not m.get('noteOnly')]
out = [f'# Связи «диагноз — препарат» и «диагноз — специалист» · {version}', '',
       f'Файл собран скриптом `tools/build_relationships.py` из содержимого приложения. Написанных разборов препаратов: {len(guides)}. '
       f'Для остальных {len(clinical) * len(drugs) - len(guides)} из {len(clinical) * len(drugs)} пар ({len(clinical)} диагнозов × {len(drugs)} препаратов) '
       'приложение собирает общий разбор по правилам из `pair-context.json` (см. таблицу правил ниже).', '',
       '## Написанные разборы препаратов', '', '| Диагноз | Препарат | Вид связи | Суть разбора |', '| --- | --- | --- | --- |']
for g in sorted(guides, key=lambda g: (name(dx[g['diagnosisId']]), list(KIND).index(g['relationKind']), meds[g['medicationId']]['name'])):
    out.append(f"| {cell(name(dx[g['diagnosisId']]))} | {cell(meds[g['medicationId']]['name'])} | {KIND[g['relationKind']]} | {cell(g['summary'])} |")
out += ['', '## Правила общих разборов', '', '| Вид | Препараты | Шаблон |', '| --- | --- | --- |']
for r in pairs['medicationRules']:
    out.append(f"| {RULE[r['kind']]} | {cell(', '.join(meds[i]['name'].split(' (')[0] for i in r['ids']))} | {cell(r['text'])} |")
out += ['', '## Специалисты по приоритету', '',
        'Порядок — как в плане помощи: сначала основная помощь, затем помощь при отдельной задаче. «Не помогает» — специалисты или методы, которые часто предлагают без доказанной пользы. '
        'Для остальных специалистов разбор сообщает, что они не входят в основную помощь, и объясняет, когда они всё же нужны.', '',
        '| Диагноз | Основная помощь | При отдельной задаче | Не помогает / не нужен |', '| --- | --- | --- | --- |']
for p in sorted(plans, key=lambda p: name(dx[p['diagnosisId']])):
    if p['diagnosisId'] not in {d['id'] for d in clinical}:
        continue
    role = lambda r: ', '.join(specs[x['specialistId']]['shortTitle'] for x in p['providers'] if x['role'] == r) or '—'
    no = ', '.join(specs[n['specialistId']]['shortTitle'] for n in p.get('notFor', [])) or '—'
    out.append(f"| {cell(name(dx[p['diagnosisId']]))} | {role('core')} | {role('conditional')} | {no} |")
(ROOT / 'docs/RELATIONSHIPS.md').write_text('\n'.join(out) + '\n')
print(f'{len(guides)} guides, {len(pairs["medicationRules"])} rules, {len(clinical)} diagnoses')
