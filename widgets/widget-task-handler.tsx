import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { NextClassWidget } from './NextClassWidget';
import { getWidgetClassData } from './widget-sync';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetInfo = props.widgetInfo;

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      if (widgetInfo.widgetName === 'NextClassWidget') {
        const data = await getWidgetClassData();
        props.renderWidget(<NextClassWidget data={data} />);
      }
      break;

    case 'WIDGET_CLICK':
      // The NextClassWidget root has clickAction="OPEN_APP"
      break;

    case 'WIDGET_DELETED':
      break;

    default:
      break;
  }
}
