'use client';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from './select';

type Option={value:string;label:string;disabled?:boolean};
export function AppSelect({label,locale,options,name,value,defaultValue,onChange,disabled}:{label:string;locale:string;options:Option[];name?:string;value?:string;defaultValue?:string;onChange?:(value:string)=>void;disabled?:boolean}){
  return <Select name={name} value={value} defaultValue={defaultValue} onValueChange={onChange} disabled={disabled} dir={locale==='ar'?'rtl':'ltr'}>
    <SelectTrigger aria-label={label}><SelectValue/></SelectTrigger>
    <SelectContent>{options.map(option=><SelectItem key={option.value} value={option.value} disabled={option.disabled}>{option.label}</SelectItem>)}</SelectContent>
  </Select>;
}
