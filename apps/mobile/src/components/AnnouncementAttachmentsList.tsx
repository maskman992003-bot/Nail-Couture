import { Image, Linking, Pressable, Text, View } from 'react-native';
import {
  formatAttachmentSize,
  isAnnouncementImageMime,
} from '@nail-couture/shared/utils/announcementAttachments.js';
import { useThemeStyles } from '../theme/useThemeStyles';

export type AnnouncementAttachmentItem = {
  url: string;
  file_name?: string;
  mime_type?: string;
  size_bytes?: number;
  kind?: string;
};

type Props = {
  attachments?: AnnouncementAttachmentItem[];
  compact?: boolean;
};

const THUMB_SIZE = 32;
const CELL_GAP = 8;

function AttachmentCell({
  attachment,
  label,
  isImage,
  styles,
}: {
  attachment: AnnouncementAttachmentItem;
  label: string;
  isImage: boolean;
  styles: ReturnType<typeof useThemeStyles>;
}) {
  return (
    <Pressable
      onPress={() => Linking.openURL(attachment.url)}
      style={[
        styles.card,
        {
          flex: 1,
          minWidth: '46%',
          maxWidth: '48%',
          padding: 8,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        },
      ]}
    >
      {isImage ? (
        <Image
          source={{ uri: attachment.url }}
          style={{ width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: 6, flexShrink: 0 }}
          resizeMode="cover"
        />
      ) : (
        <Text style={{ fontSize: 14, flexShrink: 0 }}>📄</Text>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.textPrimary, { fontSize: 11 }]} numberOfLines={1}>{label}</Text>
        {attachment.size_bytes ? (
          <Text style={[styles.textSecondary, { fontSize: 10 }]}>
            {formatAttachmentSize(attachment.size_bytes)}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export function AnnouncementAttachmentsList({ attachments = [], compact = false }: Props) {
  const styles = useThemeStyles();
  if (!attachments.length) return null;

  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: CELL_GAP,
        marginTop: compact ? 8 : 12,
      }}
    >
      {attachments.map((attachment, index) => {
        const label = attachment.file_name || `Attachment ${index + 1}`;
        const isImage = attachment.kind === 'image' || isAnnouncementImageMime(attachment.mime_type);

        return (
          <AttachmentCell
            key={`${attachment.url}-${index}`}
            attachment={attachment}
            label={label}
            isImage={isImage}
            styles={styles}
          />
        );
      })}
    </View>
  );
}
