import { Request, Response } from 'express';
import { LANGUAGE_REGISTRY } from '../../config/languages';

export const languageController = {
  getLanguages: (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: LANGUAGE_REGISTRY.map(lang => ({
        code: lang.code,
        name: lang.name,
        nativeName: lang.nativeName,
        flag: lang.flag,
        rtl: lang.rtl || false,
        variants: lang.variants,
        defaultVariant: lang.defaultVariant,
      })),
    });
  },
};
