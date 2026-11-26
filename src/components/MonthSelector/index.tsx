'use client';
import { useRouter } from 'next/navigation';
export function MonthSelector({month}: {month:string}) {
 const router=useRouter();
 return <label>Período <input type="month" value={month} onChange={event=>{if(/^\d{4}-(0[1-9]|1[0-2])$/.test(event.target.value)) router.push('/?month='+event.target.value);}} /></label>;
}
