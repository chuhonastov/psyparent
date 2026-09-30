import React from 'react';
import Disclosure from './Disclosure';
import Icon from './Icon';
import type {Source} from '../lib/content';
export default function Sources({items,updatedAt}:{items:Source[];updatedAt?:string}) {
 return <Disclosure title="Откуда эта информация"><p className="small muted">Материалы помогают подготовиться к разговору с врачом. Международные рекомендации могут различаться по возрасту и доступности лечения.</p>
 <ul className="sources">{items.map((s,i)=><li key={i}>{s.url?<a href={s.url} target="_blank" rel="noopener noreferrer">{s.label}<Icon name="external" size={14}/></a>:s.label}</li>)}</ul>
 {updatedAt&&<p className="small muted">Материал обновлён {new Date(updatedAt+'T12:00:00').toLocaleDateString('ru-RU')}.</p>}</Disclosure>;
}
