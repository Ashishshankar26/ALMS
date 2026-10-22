import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NextClassWidget } from './NextClassWidget';
import { AttendanceWidget } from './AttendanceWidget';
import { QuickStatsWidget } from './QuickStatsWidget';
import { getWidgetClassData, getWidgetAttendanceData, getWidgetQuickStatsData } from './widget-sync';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetInfo = props.widgetInfo;
  const stackKey = `@widget_stack_${widgetInfo.widgetId}`;

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      if (widgetInfo.widgetName === 'NextClassWidget') {
        const savedStack = await AsyncStorage.getItem(stackKey);
        const stackIndex = savedStack ? parseInt(savedStack, 10) : 0;
        const data = await getWidgetClassData();
        data.stackIndex = isNaN(stackIndex) ? 0 : stackIndex;
        props.renderWidget(<NextClassWidget data={data} widgetInfo={widgetInfo} />);
      } else if (widgetInfo.widgetName === 'AttendanceWidget') {
        const data = await getWidgetAttendanceData();
        props.renderWidget(<AttendanceWidget data={data} widgetInfo={widgetInfo} />);
      } else if (widgetInfo.widgetName === 'QuickStatsWidget') {
        const data = await getWidgetQuickStatsData();
        props.renderWidget(<QuickStatsWidget data={data} widgetInfo={widgetInfo} />);
      }
      break;
    }

    case 'WIDGET_CLICK': {
      if (props.clickAction === 'CYCLE_STACK') {
        const savedStack = await AsyncStorage.getItem(stackKey);
        const currentIdx = savedStack ? parseInt(savedStack, 10) : 0;
        const nextIdx = ((isNaN(currentIdx) ? 0 : currentIdx) + 1) % 3;
        await AsyncStorage.setItem(stackKey, String(nextIdx));

        const data = await getWidgetClassData();
        data.stackIndex = nextIdx;
        props.renderWidget(<NextClassWidget data={data} widgetInfo={widgetInfo} />);
      }
      break;
    }

    case 'WIDGET_DELETED': {
      try {
        await AsyncStorage.removeItem(stackKey);
      } catch (e) {}
      break;
    }

    default:
      break;
  }
}
