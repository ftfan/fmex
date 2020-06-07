import { Candle } from '@/data/Data';
import { ViewOptions } from '@/core/View';
import BigNumber from 'bignumber.js';

const TargetSwitch: any = {
  MA5: MANum.bind(null, 5),
  MA15: MANum.bind(null, 15),
  MA20: MANum.bind(null, 20),
  BOLL10: BOLLNum.bind(null, 10),
  BOLL20: BOLLNum.bind(null, 20),
  BOLL30: BOLLNum.bind(null, 30),

  OBV: OBVNum.bind(null, 0),
  'OBV*多空比例净额': OBVNum2.bind(null, 0),
};

const allTarget: Set<string> = new Set();
export const TargetResults = (rawData: Candle[], Options: ViewOptions, opt: any) => {
  // console.log(...Options.Target);
  Options.Target.forEach((target) => {
    allTarget.add(target);
  });
  allTarget.forEach((target) => {
    if (TargetSwitch[target]) TargetSwitch[target](rawData, Options, opt);
  });
};

function MA(dayCount: number, rawData: Candle[]) {
  const result = [];
  for (let i = 0, len = rawData.length; i < len; i++) {
    if (i < dayCount) {
      result.push('-');
      continue;
    }
    let sum = new BigNumber(0);
    for (let j = 0; j < dayCount; j++) {
      sum = sum.plus(rawData[i - j].close);
    }
    result.push(sum.div(dayCount).toFixed(2));
  }
  return result;
}

function BOOL(maDays: number, rawData: Candle[]) {
  //移动平均线周期为20
  const tickBegin = maDays - 1;
  let maSum = 0;
  let p = 0;
  const ups = [];
  const mas = [];
  const lows = [];
  for (let i = 0; i < rawData.length; i++) {
    const c = rawData[i];
    let ma = 0;
    let md = 0;
    let bstart = 0;
    let mdSum = 0;
    maSum += c.close;
    if (i >= tickBegin) {
      maSum = maSum - p;
      ma = maSum / maDays;
      mas.push(ma.toFixed(2));
      bstart = i - tickBegin;
      p = rawData[bstart].close;
      mdSum = rawData.slice(bstart, bstart + maDays).reduce(function(a, b) {
        return a + Math.pow(b.close - ma, 2);
      }, 0);
      md = Math.sqrt(mdSum / maDays);
      const md2 = 2 * md;
      const up = ma + md2;
      const low = ma - md2;
      ups.push(up.toFixed(2));
      lows.push(low.toFixed(2));
    } else {
      // ugly constant, just keep the same type for client
      ups.push('-');
      mas.push('-');
      lows.push('-');
    }
  }
  return { upper: ups, mid: mas, lower: lows };
}

function OBV(rawData: Candle[]) {
  let lastTick: any = null;
  const obvs = [];
  for (let i = 0; i < rawData.length; i++) {
    let value = 0;
    const curTick = rawData[i];
    if (i != 0) {
      const curClose = curTick.close;
      const lastClose = lastTick.close;
      const curVol = curTick.volume;
      // const lastVol = parseFloat(lastTick.volume);
      const lastObvValue = obvs[i - 1];
      if (curClose >= lastClose) {
        value = lastObvValue + curVol;
      } else {
        value = lastObvValue - curVol;
      }
    }
    obvs.push(value);
    lastTick = curTick;
  }
  return obvs;
}
function OBV2(rawData: Candle[]) {
  let lastTick: any = null;
  const obvs = [];
  for (let i = 0; i < rawData.length; i++) {
    let value = 0;
    const curTick = rawData[i];
    if (i != 0) {
      const curClose = curTick.close;
      // const lastClose = parseFloat(lastTick.close);
      const curVol = curTick.volume;
      // const lastVol = parseFloat(lastTick.volume);
      const lastObvValue = obvs[i - 1];
      const p = (curClose - curTick.low - curTick.high - curTick.close) / (curTick.high - curTick.low);
      value = lastObvValue + curVol * p;
      // if (curClose >= parseFloat(lastTick.close)) {
      //   value = lastObvValue + curVol * p;
      // } else {
      //   value = lastObvValue - curVol * p;
      // }
    }
    obvs.push(value);
    lastTick = curTick;
  }
  return obvs;
}

function OBVNum(num: number, rawData: Candle[], Options: ViewOptions, opt: any) {
  let opacity = 1;
  const name = 'OBV';
  if (Options.Target.indexOf(name) === -1) opacity = 0;
  const datas: any = opacity ? OBV(rawData) : {};
  opt.series.push({
    name,
    type: 'bar',
    yAxisIndex: 1,
    data: opacity ? datas : [],
    smooth: true,
    showSymbol: false,
    lineStyle: {
      width: 2,
      opacity,
    },
  });
}

function OBVNum2(num: number, rawData: Candle[], Options: ViewOptions, opt: any) {
  let opacity = 1;
  const name = 'OBV*多空比例净额';
  if (Options.Target.indexOf(name) === -1) opacity = 0;
  const datas: any = opacity ? OBV2(rawData) : {};
  opt.series.push({
    name,
    type: 'bar',
    yAxisIndex: 1,
    data: opacity ? datas : [],
    smooth: true,
    showSymbol: false,
    lineStyle: {
      width: 2,
      opacity,
    },
  });
}

function BOLLNum(num: number, rawData: Candle[], Options: ViewOptions, opt: any) {
  let opacity = 1;
  const name = 'BOLL' + num;
  if (Options.Target.indexOf(name) === -1) opacity = 0;
  const datas: any = opacity ? BOOL(num, rawData) : {};
  opt.series.push(
    {
      name: name,
      bollType: 'upper',
      type: 'line',
      data: opacity ? datas.upper : [],
      smooth: true,
      showSymbol: false,
      lineStyle: {
        width: 2,
        opacity,
      },
    },
    {
      name: name,
      bollType: 'lower',
      type: 'line',
      data: opacity ? datas.lower : [],
      smooth: true,
      showSymbol: false,
      lineStyle: {
        width: 2,
        opacity,
      },
    },
    {
      name: name,
      bollType: 'mid',
      type: 'line',
      data: opacity ? datas.mid : [],
      smooth: true,
      showSymbol: false,
      lineStyle: {
        width: 2,
        opacity,
      },
    }
  );
}

function MANum(num: number, rawData: Candle[], Options: ViewOptions, opt: any) {
  const name = 'MA' + num;
  let opacity = 1;
  if (Options.Target.indexOf(name) === -1) opacity = 0;
  opt.series.push({
    name,
    type: 'line',
    data: opacity ? MA(num, rawData) : [],
    smooth: true,
    showSymbol: false,
    lineStyle: {
      width: 4,
      opacity,
    },
  });
}
