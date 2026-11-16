'use client';
import * as Primitive from '@radix-ui/react-switch';
import type {ComponentProps} from 'react';
import {useState} from 'react';

export interface SwitchProps extends Omit<ComponentProps<typeof Primitive.Root>,'onChange'>{
  name?:string;
  value?:string;
}

export function Switch({name,value='on',checked,defaultChecked,onCheckedChange,className='',...props}:SwitchProps){
  const [internal,setInternal]=useState(Boolean(defaultChecked));
  const isControlled=checked!==undefined;
  const current=isControlled?Boolean(checked):internal;
  return (
    <>
      {name&&current&&<input type="hidden" name={name} value={value}/>}
      <Primitive.Root
        {...props}
        checked={isControlled?current:undefined}
        defaultChecked={isControlled?undefined:defaultChecked}
        onCheckedChange={next=>{
          if(!isControlled)setInternal(next);
          onCheckedChange?.(next);
        }}
        className={'amc-switch '+(className||'')}
      >
        <Primitive.Thumb className="amc-switch-thumb"/>
      </Primitive.Root>
    </>
  );
}
