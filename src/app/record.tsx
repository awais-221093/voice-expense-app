import { Redirect } from 'expo-router';

/** voiceexpenseapp://record (launcher shortcut, IDEAS I10): Home starts a hands-free recording. */
export default function RecordLink() {
  return <Redirect href={{ pathname: '/', params: { record: '1' } }} />;
}
