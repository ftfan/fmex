export const sleep = (time: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, time || 20);
  });
};

export const IdCreate = () => {
  return (
    getTimeId().toString(36) +
    Math.random()
      .toString(36)
      .replace('0.', '')
      .toLocaleLowerCase()
  );
};

// 保证内存内，该数值是唯一ID
const timeIds: any = {};
export const getTimeId = (time = Date.now()): number => {
  if (timeIds[time]) return getTimeId(time + 1);
  timeIds[time] = true;
  return time;
};

export function clone<T>(data: T) {
  return JSON.parse(JSON.stringify(data)) as T;
}

/**
 * 加载 Script 资源
 */
export const LoadScript = (
  url: string,
  attr: {
    [index: string]: string;
  } = {
    type: 'text/javascript',
  }
) => {
  return new Promise((resolve, reject) => {
    const scriptElement = document.createElement('script');
    scriptElement.addEventListener(
      'load',
      (e) => {
        document.body.removeChild(scriptElement);
        resolve(e);
      },
      false
    );
    scriptElement.addEventListener(
      'error',
      (e) => {
        document.body.removeChild(scriptElement);
        reject(e);
      },
      false
    );

    if (attr) {
      for (const val of Object.keys(attr)) {
        scriptElement.setAttribute(val, attr[val]);
      }
    }

    scriptElement.src = url;
    document.body.appendChild(scriptElement);
  });
};
