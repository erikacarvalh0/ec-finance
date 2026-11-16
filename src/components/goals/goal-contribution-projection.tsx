'use client';

import { useState } from 'react';
import { projectGoalContributions } from '@/modules/goals/projection';

export function GoalContributionProjection({
    targetInCents,
    savedInCents,
}: {
    targetInCents: string;
    savedInCents: string;
}) {
    const [monthlyCents, setMonthlyCents] = useState('0');
    const valid = /^(0|[1-9][0-9]*)$/.test(monthlyCents)
        && monthlyCents.length <= 18;
    const projection = valid
        ? projectGoalContributions(
            BigInt(targetInCents),
            BigInt(savedInCents),
            BigInt(monthlyCents),
        )
        : null;

    return (
        <section aria-label="Simulação de contribuições">
            <h3>Simular contribuições</h3>
            <label>
                Aporte mensal (centavos)
                <input
                    type="text"
                    inputMode="numeric"
                    value={monthlyCents}
                    onChange={(event) => setMonthlyCents(event.target.value)}
                    aria-invalid={!valid}
                />
            </label>
            {!valid ? (
                <p role="alert">Informe um valor inteiro não negativo em centavos.</p>
            ) : projection?.months === 0 ? (
                <p>Meta já atingida.</p>
            ) : projection?.reached ? (
                <p>Prazo estimado: {projection.months} mês(es).</p>
            ) : (
                <p>Sem aporte mensal positivo, não há previsão de conclusão.</p>
            )}
            <p>Simulação sem rendimentos ou inflação; aportes no fim de cada mês. Não altera sua meta.</p>
        </section>
    );
}
