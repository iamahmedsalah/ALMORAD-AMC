'use client';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from './select';
import {useState} from 'react';

type Option={value:string;label:string;disabled?:boolean};
export function AppSelect({label,locale,options,name,value,defaultValue,onChange,disabled}:{label:string;locale:string;options:Option[];name?:string;value?:string;defaultValue?:string;onChange?:(value:string)=>void;disabled?:boolean}){
  const [localValue,setLocalValue]=useState(defaultValue??'');
  const selected=value??localValue;const emptyValue='__amc_empty_option__';
  return <>{name&&<input type="hidden" name={name} value={selected} disabled={disabled}/>}<Select value={selected===''?emptyValue:selected} onValueChange={next=>{const actual=next===emptyValue?'':next;setLocalValue(actual);onChange?.(actual);}} disabled={disabled} dir={locale==='ar'?'rtl':'ltr'}>
    <SelectTrigger aria-label={label}><SelectValue/></SelectTrigger>
    <SelectContent>{options.map(option=><SelectItem key={option.value} value={option.value===''?emptyValue:option.value} disabled={option.disabled}>{option.label}</SelectItem>)}</SelectContent>
  </Select></>;
}
