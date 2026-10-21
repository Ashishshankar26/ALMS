import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export interface NextClassWidgetData {
  status: 'ongoing' | 'upcoming' | 'tomorrow' | 'no_classes';
  statusText: string;
  time: string;
  subject: string;
  room: string;
  type: string;
  subjectCode: string;
}

export function NextClassWidget({ data }: { data?: NextClassWidgetData }) {
  if (!data || data.status === 'no_classes' || !data.subject) {
    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: '#0F1117',
          borderRadius: 24,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.1)',
          padding: 16,
          justifyContent: 'center',
          alignItems: 'center',
        }}
        clickAction="OPEN_APP"
      >
        <TextWidget
          text="ALMS • All Caught Up"
          style={{
            color: '#10B981',
            fontSize: 14,
            fontWeight: 'bold',
            marginBottom: 6,
          }}
        />
        <TextWidget
          text="No more classes scheduled today."
          style={{
            color: 'rgba(255, 255, 255, 0.65)',
            fontSize: 12,
            textAlign: 'center',
          }}
        />
      </FlexWidget>
    );
  }

  const isOngoing = data.status === 'ongoing';
  const isTomorrow = data.status === 'tomorrow';
  const isLab = (data.type || '').toLowerCase().includes('practical') || (data.type || '').toLowerCase().includes('lab');

  // Theme accents
  const accentColor = isOngoing ? '#10B981' : (isTomorrow ? '#A855F7' : (isLab ? '#10B981' : '#6366F1'));
  const statusBg = isOngoing ? 'rgba(16, 185, 129, 0.2)' : (isTomorrow ? 'rgba(168, 85, 247, 0.2)' : 'rgba(99, 102, 241, 0.2)');

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#0F1117',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
        padding: 16,
        justifyContent: 'space-between',
      }}
      clickAction="OPEN_APP"
    >
      {/* Top Header Row: Status and Time */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: 'match_parent',
        }}
      >
        {/* Status Pill */}
        <FlexWidget
          style={{
            backgroundColor: statusBg,
            borderRadius: 12,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderWidth: 1,
            borderColor: accentColor,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <TextWidget
            text={data.statusText || (isOngoing ? 'LIVE NOW' : (isTomorrow ? 'TOMORROW' : 'NEXT CLASS'))}
            style={{
              color: accentColor,
              fontSize: 10,
              fontWeight: 'bold',
            }}
          />
        </FlexWidget>

        {/* Time Pill */}
        <FlexWidget
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            borderRadius: 10,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.12)',
          }}
        >
          <TextWidget
            text={data.time}
            style={{
              color: '#FFFFFF',
              fontSize: 10,
              fontWeight: '700',
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* Middle: Subject Name */}
      <FlexWidget
        style={{
          width: 'match_parent',
          marginVertical: 6,
        }}
      >
        <TextWidget
          text={data.subject}
          maxLines={2}
          truncate="END"
          style={{
            color: '#FFFFFF',
            fontSize: 15,
            fontWeight: 'bold',
            lineHeight: 19,
          }}
        />
      </FlexWidget>

      {/* Bottom Chips: Room, Code, Type */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          width: 'match_parent',
        }}
      >
        {/* Room Badge */}
        <FlexWidget
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            borderRadius: 8,
            paddingHorizontal: 7,
            paddingVertical: 3,
            marginRight: 6,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.1)',
          }}
        >
          <TextWidget
            text={data.room && data.room !== 'TBA' ? (data.room.toLowerCase().startsWith('room') ? data.room : `Room ${data.room}`) : 'Room TBA'}
            style={{
              color: '#FFFFFF',
              fontSize: 10,
              fontWeight: '600',
            }}
          />
        </FlexWidget>

        {/* Subject Code */}
        {data.subjectCode ? (
          <FlexWidget
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: 8,
              paddingHorizontal: 7,
              paddingVertical: 3,
              marginRight: 6,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.1)',
            }}
          >
            <TextWidget
              text={data.subjectCode}
              style={{
                color: 'rgba(255, 255, 255, 0.75)',
                fontSize: 10,
                fontWeight: '600',
              }}
            />
          </FlexWidget>
        ) : null}

        {/* Type Badge */}
        <FlexWidget
          style={{
            backgroundColor: 'rgba(99, 102, 241, 0.15)',
            borderRadius: 8,
            paddingHorizontal: 7,
            paddingVertical: 3,
            borderWidth: 1,
            borderColor: 'rgba(99, 102, 241, 0.3)',
          }}
        >
          <TextWidget
            text={(data.type || 'Lecture').toUpperCase()}
            style={{
              color: accentColor,
              fontSize: 9,
              fontWeight: 'bold',
            }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
