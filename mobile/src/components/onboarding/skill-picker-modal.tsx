import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PathoraButton } from '@/components/pathora-button';
import { PathoraCheckbox } from '@/components/pathora-checkbox';
import { PathoraColors, PathoraFonts, PathoraRadius, PathoraSpacing } from '@/constants/pathora-theme';
import type { InternProfileSkill } from '@/lib/api';

export type SkillPickerModalProps = {
  visible: boolean;
  skills: InternProfileSkill[];
  selectedSkillIds: string[];
  onToggleSkill: (skillId: string) => void;
  onClose: () => void;
};

export function SkillPickerModal({
  visible,
  skills,
  selectedSkillIds,
  onToggleSkill,
  onClose,
}: SkillPickerModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.handle} />
          <Text style={styles.title}>Choose your skills</Text>
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {skills.map((skill) => {
              const checked = selectedSkillIds.includes(skill.id);
              return (
                <Pressable
                  key={skill.id}
                  onPress={() => onToggleSkill(skill.id)}
                  style={styles.row}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}>
                  <Text style={styles.rowLabel}>{skill.name}</Text>
                  <PathoraCheckbox checked={checked} onToggle={() => onToggleSkill(skill.id)} />
                </Pressable>
              );
            })}
          </ScrollView>
          <PathoraButton label="Done" variant="primary" onPress={onClose} style={styles.doneButton} />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(22, 33, 58, 0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: PathoraColors.surface,
    borderTopLeftRadius: PathoraRadius[20],
    borderTopRightRadius: PathoraRadius[20],
    paddingHorizontal: PathoraSpacing[24],
    paddingTop: 12,
    maxHeight: '75%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: PathoraRadius[999],
    backgroundColor: PathoraColors.borderStrong,
    marginBottom: PathoraSpacing[16],
  },
  title: {
    fontFamily: PathoraFonts.en.extraBold,
    fontSize: 18,
    color: PathoraColors.ink900,
    marginBottom: PathoraSpacing[12],
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    paddingBottom: PathoraSpacing[12],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: PathoraColors.border,
  },
  rowLabel: {
    fontFamily: PathoraFonts.en.regular,
    fontSize: 14.5,
    color: PathoraColors.ink900,
  },
  doneButton: {
    marginTop: PathoraSpacing[12],
    marginBottom: PathoraSpacing[24],
  },
});
