'use client';
import { Input } from '@erikacarvalho/react/Input';
import { Form } from '@erikacarvalho/react/Form';
import { Select } from '@erikacarvalho/react/Select';
import type { ManagedCategory } from '@/modules/categories/management';

const icons=['shopping-cart','house','car-front','heart','ellipsis','wallet','briefcase','trending-up','arrow-left-right'];
const validateColor=(value:string)=>/^#[0-9a-fA-F]{6}$/.test(value)?undefined:'Informe uma cor hexadecimal (#RRGGBB).';
export function CategoryForm({row,busy,save}:{row?:ManagedCategory;busy:boolean;save:(category:unknown)=>void}) {
    return <fieldset disabled={busy} style={{border:0,padding:0,minWidth:0}}>
        <Form buttonText="Salvar categoria" handleSubmit={values=>save({name:values.name,color:values.color,iconBackground:values.iconBackground,icon:values.icon})}>
            <Input name="name" label="Nome" defaultValue={row?.name??''} isRequired validate={value=>value.trim().length>=1&&value.trim().length<=100?undefined:'Informe de 1 a 100 caracteres.'}/>
            <Input name="color" label="Cor do indicador" defaultValue={row?.color??'#929BAA'} isRequired validate={validateColor}/>
            <Input name="iconBackground" label="Fundo do ícone" defaultValue={row?.iconBackground??'#EDF0F5'} isRequired validate={validateColor}/>
            <Select name="icon" label="Ícone" options={icons} defaultValue={row?.icon??'ellipsis'} isRequired/>
        </Form>
    </fieldset>;
}
