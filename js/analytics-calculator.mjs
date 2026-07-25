function normalizeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundValue(value) {
  return Number(value.toFixed(2));
}

export function calculateWindowMultiplier(rangeStart, rangeEnd) {
  if (!(rangeStart instanceof Date) || !(rangeEnd instanceof Date)) {
    return 1;
  }

  const durationMs = rangeEnd.getTime() - rangeStart.getTime();
  if (durationMs <= 0) {
    return 1;
  }

  const oneDayMs = 24 * 60 * 60 * 1000;
  return durationMs / oneDayMs;
}

export function calculateConversionPercent(value, previousValue) {
  const base = normalizeNumber(previousValue);
  if (base <= 0) {
    return 0;
  }
  return (normalizeNumber(value) / base) * 100;
}

export function calculateCampaignCalculatorMetrics({
  dailyCost,
  uniqueVisits,
  uniqueWhatsapp,
  arrived,
  derived,
  rangeStart,
  rangeEnd
}) {
  const cost = normalizeNumber(dailyCost);
  const visits = normalizeNumber(uniqueVisits);
  const whatsapp = normalizeNumber(uniqueWhatsapp);
  const arrivedValue = normalizeNumber(arrived);
  const derivedValue = normalizeNumber(derived);
  const windowMultiplier = calculateWindowMultiplier(rangeStart, rangeEnd);

  const periodCost = roundValue(cost * windowMultiplier);
  const arrivedRatePercent = roundValue(calculateConversionPercent(arrivedValue, whatsapp));
  const derivedRatePercent = roundValue(calculateConversionPercent(derivedValue, arrivedValue));

  return {
    periodCost,
    arrivedRatePercent,
    derivedRatePercent,
    costPerArrived: arrivedValue > 0 ? roundValue(periodCost / arrivedValue) : 0,
    costPerDerived: derivedValue > 0 ? roundValue(periodCost / derivedValue) : 0,
    windowMultiplier,
    visits,
    whatsapp,
    arrived: arrivedValue,
    derived: derivedValue
  };
}
