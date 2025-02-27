import React, {
  forwardRef,
  useEffect,
  useRef,
  useImperativeHandle,
  useCallback,
} from 'react';
import classnames from 'classnames';
import { useForceUpdate } from '@/hooks/useForceUpdate';
import { YQ_SANDBOX_BOARD_IFRAME } from '@/isomorphic/constants';
import { SandBoxMessageKey, SandBoxMessageType } from '@/isomorphic/sandbox';
import { transformDOM } from '@/core/transform-dom';
import { __i18n } from '@/isomorphic/i18n';
import styles from './index.module.less';

type Rect = Pick<DOMRect, 'width' | 'height' | 'left' | 'top'>;

export interface ISelectorRef {
  onSave: () => void;
}

interface ISelectorProps {
  destroySelectArea: () => void;
}

export default forwardRef<ISelectorRef, ISelectorProps>((props, propsRef) => {
  const { forceUpdate } = useForceUpdate();
  const targetRectListRef = useRef<Rect[]>([]);
  const targetRectRef = useRef<Rect | null>();
  const targetRef = useRef<Element | null>();
  const targetListRef = useRef<Array<Element>>([]);
  const ref = useRef<HTMLDivElement>(null);

  const onSave = useCallback(() => {
    const selections = targetListRef.current.filter(item => item) || [];
    const selectAreaElements = transformDOM(selections);
    const HTMLs = Array.from(selectAreaElements);
    const iframe = document.querySelector(
      `#${YQ_SANDBOX_BOARD_IFRAME}`,
    ) as HTMLIFrameElement;
    iframe.contentWindow?.postMessage(
      {
        key: SandBoxMessageKey,
        action: SandBoxMessageType.getSelectedHtml,
        data: {
          HTMLs,
        },
      },
      '*',
    );
    iframe.classList.add('show');
    iframe.focus();
    props.destroySelectArea();
  }, []);

  useEffect(() => {
    function handleMouseOver(e: MouseEvent) {
      const target = document.elementFromPoint(e.clientX, e.clientY);
      // 跳过遮罩层本身
      if (target === ref.current || !target) {
        return;
      }

      // 如果选中元素已经被选中不再选中
      if (targetListRef.current.find(item => item === target)) {
        return;
      }

      // 选中的目标是背景的话不会被选中
      if (target?.closest('.select-inner')) {
        return;
      }

      if (typeof target?.getBoundingClientRect !== 'function') {
        return;
      }

      const scrollbarHeight = document.documentElement.scrollTop;
      const scrollbarWidth = document.documentElement.scrollLeft;

      const { width, height, left, top } = target.getBoundingClientRect();
      targetRef.current = target;
      targetRectRef.current = {
        width,
        height,
        left: left + scrollbarWidth,
        top: top + scrollbarHeight,
      };
      forceUpdate();
    }

    const onToggleSelect = (e: MouseEvent) => {
      e.stopImmediatePropagation();
      e.preventDefault();
      const target = e.target as Element;
      if (target.closest('.select-confirm')) {
        onSave();
      } else if (target?.closest('.select-inner')) {
        const key = parseInt(
          target.getAttribute('data-select-index') as string,
        );
        targetRectListRef.current = targetRectListRef.current.filter(
          (__, index) => key !== index,
        );
        targetListRef.current = targetListRef.current.filter(
          (__, index) => key !== index,
        );
      } else {
        if (!targetRectRef.current || !targetRef.current) {
          return;
        }
        targetRectListRef.current = [
          ...targetRectListRef.current.filter((__, index) => {
            return !targetRef.current?.contains(targetListRef.current[index]);
          }),
          targetRectRef.current,
        ];
        targetListRef.current = [
          ...targetListRef.current.filter((__, index) => {
            return !targetRef.current?.contains(targetListRef.current[index]);
          }),
          targetRef.current,
        ];
        targetRef.current = null;
        targetRectRef.current = null;
      }
      forceUpdate();
      setTimeout(() => {
        window.focus();
      }, 200);
    };

    window.addEventListener('mouseover', handleMouseOver);
    window.addEventListener('click', onToggleSelect, true);
    return () => {
      window.removeEventListener('mouseover', handleMouseOver);
      window.removeEventListener('click', onToggleSelect, true);
    };
  }, [onSave]);

  useImperativeHandle(
    propsRef,
    () => ({
      onSave: () => {
        onSave();
      },
    }),
    [onSave],
  );

  return (
    <>
      <div className={classnames(styles.mask, 'select-inner')}>
        {__i18n('单击区域以选中，再次单击取消选中。ESC 退出， ↲ 完成')}
        {!!targetRectListRef.current.length && (
          <div
            className={classnames(styles.confirm, 'select-confirm')}
            onClick={onSave}
          >
            {__i18n('确认选取')}({targetRectListRef.current.length})
          </div>
        )}
      </div>
      {targetRectListRef.current.map((item, index) => {
        return (
          item?.width && (
            <div
              className={classnames(
                styles.selectInner,
                styles.selected,
                'select-inner',
              )}
              style={{
                ...item,
                pointerEvents: 'all',
              }}
              key={index}
              data-select-index={index}
            />
          )
        );
      })}
      {targetRectRef.current?.width && (
        <div
          ref={ref}
          className={styles.selectInner}
          style={{
            ...targetRectRef.current,
          }}
        />
      )}
    </>
  );
});
