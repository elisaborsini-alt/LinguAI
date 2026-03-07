import {apiClient} from '../client';

export interface LanguageVariantResponse {
  code: string;
  name: string;
  flag: string;
  locale: string;
}

export interface LanguageResponse {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  rtl: boolean;
  variants: LanguageVariantResponse[];
  defaultVariant: string;
}

export interface GetLanguagesResponse {
  success: boolean;
  data: LanguageResponse[];
}

export const languagesApi = {
  getAll: async (): Promise<LanguageResponse[]> => {
    const response = await apiClient.get<GetLanguagesResponse>('/languages');
    return response.data.data;
  },
};
