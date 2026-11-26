'use client';
import { Card } from '@erikacarvalho/react/Card';
import { Chart } from '@erikacarvalho/react/Chart';
const currency = new Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'});
const colors = ['#007e84','#20b8b1','#72d1cc','#a4dcd9','#d0eae8'];
export function ExpensesByCategory({categories}: {categories: {name:string; cents:number}[]}) {
    const positive = categories.filter(c => c.cents > 0);
    const total = positive.reduce((sum,c)=>sum+c.cents,0);
    const data = positive.map((c,i)=>({label:c.name,color:colors[i%colors.length],percentage:Math.round(c.cents/total*10000)/100}));
    return <Card title="Despesas por categoria">
        {total === 0 ? <p>Nenhuma despesa por categoria neste mês.</p> : <>
            <Chart config={{type:'pie',donut:true,centerLabel:currency.format(total/100)}} data={data}/>
            <ul>{positive.map((c,i)=><li key={i}>{c.name}: {currency.format(c.cents/100)}</li>)}</ul>
        </>}
    </Card>;
}
