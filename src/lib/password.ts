import { CodeObj, Code } from '@/types/Api';

/**
 * 对用户输入的密码进行乱七八糟的操作
 */
export const PasswordEnc = (password: string) => {
  const p1 = CryptoJS.MD5(password).toString();
  const p2 = CryptoJS.MD5([password, p1].join('')).toString();
  const p3 = CryptoJS.MD5([p2, password, p1].join('')).toString();
  const p4 = CryptoJS.MD5([p2, p3, p1].join('')).toString();
  return [p4].join('');
};

// 加密
export const EncryptStrByPassword = (password: string, data: string) => {
  const pwd = PasswordEnc(password);
  const Data = CryptoJS.AES.encrypt(data, pwd).toString();

  // 校验
  const res = DecryptStrByPassword(password, Data);
  if (res.Error()) return res;
  if (res.Data !== data) return new CodeObj(Code.Error, null, '加密出现异常');

  return new CodeObj(Code.Success, Data);
};

// 解密
export const DecryptStrByPassword = (password: string, result: string) => {
  const pwd = PasswordEnc(password);
  const bytes = CryptoJS.AES.decrypt(result, pwd);
  const originalText = bytes.toString(CryptoJS.enc.Utf8);
  return new CodeObj(Code.Success, originalText);
};
