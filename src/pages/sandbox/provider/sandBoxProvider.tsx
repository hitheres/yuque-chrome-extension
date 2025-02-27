import React, {
  useMemo,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  ClippingTypeEnum,
  SandBoxMessageKey,
  SandBoxMessageType,
} from '@/isomorphic/sandbox';
import { message } from 'antd';
import { ocrManager } from '../ocr/ocr-manager';

interface ISandboxContext {
  defaultSelectHTML: HTMLElement[];
  clippingType: ClippingTypeEnum | null;
  editorLoading: boolean;
  enableOcr: boolean;
  updateClippingType: React.Dispatch<
    React.SetStateAction<ClippingTypeEnum | null>
  >;
  updateEnableOcr: React.Dispatch<React.SetStateAction<boolean>>;
}

const noop = () => {
  //
};

export const SandboxContext = createContext<ISandboxContext>({
  defaultSelectHTML: [],
  clippingType: null,
  editorLoading: false,
  enableOcr: false,
  updateClippingType: noop,
  updateEnableOcr: noop,
});

interface ISandboxProviderProps {
  children?: React.ReactNode;
}

export function SandboxProvider(props: ISandboxProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const [defaultSelectHTML, setDefaultSelectHTML] = useState<any[]>([]);
  const [clippingType, updateClippingType] = useState<ClippingTypeEnum | null>(
    null,
  );
  const [editorLoading, setEditorLoading] = useState(false);
  const [enableOcr, updateEnableOcr] = useState(false);

  const providerValues = useMemo(
    () => ({
      defaultSelectHTML,
      clippingType,
      editorLoading,
      enableOcr,
      updateClippingType,
      updateEnableOcr,
    }),
    [
      defaultSelectHTML,
      clippingType,
      editorLoading,
      enableOcr,
      updateClippingType,
      updateEnableOcr,
    ],
  );

  useEffect(() => {
    const listener = (e: MessageEvent<any>) => {
      if (e.data?.key !== SandBoxMessageKey) {
        return;
      }
      const { action, data } = e.data || {};
      switch (action) {
        case SandBoxMessageType.getSelectedHtml: {
          const { HTMLs, type } = data;
          setDefaultSelectHTML(HTMLs);
          if (type !== undefined) {
            updateClippingType(type);
          }
          setIsReady(true);
          break;
        }
        case SandBoxMessageType.initSandbox: {
          setIsReady(true);
          break;
        }
        case SandBoxMessageType.startOcr: {
          setIsReady(true);
          if (!data.blob) {
            message.error('图片不支持 ocr');
            return;
          }
          setEditorLoading(true);
          ocrManager.startOCR('blob', data.blob).then(res => {
            setDefaultSelectHTML(res?.map(item => item.text) || []);
            setEditorLoading(false);
          });
          break;
        }
        default:
          break;
      }
    };
    window.addEventListener('message', listener);
    return () => {
      window.addEventListener('message', listener);
    };
  }, []);

  return (
    <SandboxContext.Provider value={providerValues}>
      {isReady && props.children}
    </SandboxContext.Provider>
  );
}

export function useSandboxContext() {
  const context = useContext(SandboxContext);
  return context;
}
