"use strict";

module.exports = {
  /** Dọn schema từ các bản thử nghiệm trước; các hàng chat trực tiếp và lịch sử cuộc gọi được giữ lại. */
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      for (const table of ["chat_conversation_labels", "chat_labels", "chat_quick_replies",
        "chat_internal_notes", "chat_assignment_history", "chat_staff_memberships",
        "chat_message_hidden"]) {
        await queryInterface.sequelize.query(`DROP TABLE IF EXISTS "${table}"`, { transaction });
      }
      for (const column of ["assigned_staff_id", "handling_status", "listing_id",
        "business_owner_id", "guest_id"]) {
        await queryInterface.sequelize.query(
          `ALTER TABLE chat_conversations DROP COLUMN IF EXISTS "${column}"`, { transaction });
      }
      for (const column of ["member_role", "pinned_at", "archived_at", "is_muted", "marked_unread"]) {
        await queryInterface.sequelize.query(
          `ALTER TABLE chat_participants DROP COLUMN IF EXISTS "${column}"`, { transaction });
      }
      await queryInterface.sequelize.query(
        "ALTER TABLE notification_preferences DROP COLUMN IF EXISTS assignments", { transaction });
    });
  },
  async down() {
    // Dữ liệu của các tính năng đã bỏ không thể khôi phục từ bản migration này.
  },
};
