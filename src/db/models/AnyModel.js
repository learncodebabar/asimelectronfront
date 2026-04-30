// db/models/AnyModel.js
import { Model } from '@nozbe/watermelondb';

export default class AnyModel extends Model {
  static table = 'table_name';
  
  // Only regular methods - NO decorators (@field, @text, @date, etc.)
  // NO import of field, text, date from watermelondb
  
  // Helper methods as needed
  someHelper() {
    return this.someField;
  }
  
  async markAsDirty() {
    await this.update(() => {
      this.synced = false;
      this.updated_at = Date.now();
    });
  }
  
  toJSON() {
    return {
      field1: this.field1,
      field2: this.field2
    };
  }
}