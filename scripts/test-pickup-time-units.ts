import {
  parseTimeToMinutes,
  validatePickupTimeCanonical,
  calculate15MinBatch,
  formatPickupTimeDisplay,
  hourMinuteAmpmToCanonical,
  canonicalTimeToISTDate,
} from '../src/lib/pickup-time';

console.log('1:00 PM ->', parseTimeToMinutes('1:00 PM')?.canonical);
console.log('12:00 PM ->', parseTimeToMinutes('12:00 PM')?.canonical);
console.log('12:00 AM ->', parseTimeToMinutes('12:00 AM')?.canonical);
console.log('13:30 ->', parseTimeToMinutes('13:30')?.canonical);
console.log('13:00 batch ->', calculate15MinBatch('13:00').displayLabel);
console.log('13:14 batch ->', calculate15MinBatch('13:14').displayLabel);
console.log('13:37 batch ->', calculate15MinBatch('13:37').displayLabel);
console.log('17:00 batch ->', calculate15MinBatch('17:00').displayLabel);
console.log('Validate 07:59 ->', validatePickupTimeCanonical('07:59').valid);
console.log('Validate 08:00 ->', validatePickupTimeCanonical('08:00').valid);
console.log('Validate 17:00 ->', validatePickupTimeCanonical('17:00').valid);
console.log('Validate 17:01 ->', validatePickupTimeCanonical('17:01').valid);
console.log('hourMinuteAmpmToCanonical(1, 30, "PM") ->', hourMinuteAmpmToCanonical(1, 30, 'PM'));
console.log('hourMinuteAmpmToCanonical(12, 0, "PM") ->', hourMinuteAmpmToCanonical(12, 0, 'PM'));
console.log('hourMinuteAmpmToCanonical(12, 0, "AM") ->', hourMinuteAmpmToCanonical(12, 0, 'AM'));
console.log('canonicalTimeToISTDate("13:00") ->', formatPickupTimeDisplay(canonicalTimeToISTDate('13:00')));
