import {z} from 'zod';
/** One canonical representation at every staff email boundary. */
export const staffEmailSchema=z.string().trim().toLowerCase().pipe(z.email().max(254));

/** Review signal only; never proof that two email addresses identify one person. */
export function likelyStaffEmailTypo(left:string,right:string):boolean {
 const [a,domainA]=left.trim().toLowerCase().split('@');
 const [b,domainB]=right.trim().toLowerCase().split('@');
 if(!a||!b||!domainA||domainA!==domainB||a===b||Math.min(a.length,b.length)<5||Math.abs(a.length-b.length)>1)return false;
 if(a.length===b.length){const mismatches=[...a].map((value,index)=>value!==b[index]?index:-1).filter(index=>index>=0);return mismatches.length===1||mismatches.length===2&&mismatches[1]===mismatches[0]!+1&&a[mismatches[0]!]===b[mismatches[1]!]&&a[mismatches[1]!]===b[mismatches[0]!];}
 const shorter=a.length<b.length?a:b,longer=a.length<b.length?b:a;
 let i=0;while(i<shorter.length&&shorter[i]===longer[i])i++;
 return shorter.slice(i)===longer.slice(i+1);
}

export const forgotPasswordInput=z.object({email:staffEmailSchema,locale:z.enum(['en','ar']).default('en')}).strict();
export const resetPasswordInput=z.object({email:staffEmailSchema,code:z.string().regex(/^\d{6}$/),newPassword:z.string().min(12).max(128)}).strict();
export const googleAuthInput=z.object({credential:z.string().min(20).max(4096)}).strict();
