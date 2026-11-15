import type {Locale} from '@amc/shared';
import {Controls} from '@/components/layout/controls';
import {authCopy} from './auth-copy';
export function AuthUtilities({locale}:{locale:Locale}){return <div className="auth-utilities"><a href={'/'+locale} className="button button-secondary">{authCopy(locale).back}</a><Controls/></div>;}
