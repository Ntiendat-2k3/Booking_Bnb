const { successResponse, errorResponse } = require("../../../utils/response");
const { User, Listing, Booking } = require("../../../models");
const { Op } = require("sequelize");
const { sendEmail } = require("../../../utils/mailer");


module.exports = {
  // Đăng ký trở thành chủ nhà (Host)
  apply: async (req, res) => {
    try {
      const user = req.user?.user;
      if (!user) return errorResponse(res, "Không có quyền truy cập", 401);

      if (user.role === "admin" || user.role === "host") {
        const fresh = await User.findByPk(user.id, {
          attributes: { exclude: ["password_hash"] },
        });
        return successResponse(res, fresh, "Bạn đã là chủ nhà rồi", 200);
      }

      if (user.role !== "guest")
        return errorResponse(res, "Vai trò không hợp lệ", 400);

      await User.update({ role: "host" }, { where: { id: user.id } });
      const fresh = await User.findByPk(user.id, {
        attributes: { exclude: ["password_hash"] },
      });
      return successResponse(
        res,
        fresh,
        "Đã nâng cấp lên tài khoản chủ nhà thành công",
        200,
      );
    } catch (e) {
      return errorResponse(res, e.message || "Nâng cấp thất bại", 500);
    }
  },

  // Lấy số liệu thống kê cho Dashboard của Host
  getDashboardStats: async (req, res) => {
    try {
      const hostId = req.user.user.id;
      if (!hostId) return errorResponse(res, "Không có quyền truy cập", 401);

      const listings = await Listing.findAll({
        where: { host_id: hostId },
        attributes: ["id"],
      });
      const listingIds = listings.map((l) => l.id);

      const totalBookings = await Booking.count({
        where: { listing_id: listingIds },
      });

      const revenueData = await Booking.sum("total_amount", {
        where: {
          listing_id: listingIds,
          status: ["confirmed", "completed"],
        },
      });
      const totalRevenue = revenueData || 0;

      const pendingBookings = await Booking.count({
        where: { listing_id: listingIds, status: "pending_payment" },
      });

      // Thống kê biểu đồ 6 tháng gần nhất
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);
      sixMonthsAgo.setHours(0, 0, 0, 0);

      const recentBookingsData = await Booking.findAll({
        where: {
          listing_id: listingIds,
          status: ["confirmed", "completed"],
          created_at: { [Op.gte]: sixMonthsAgo },
        },
        attributes: ["total_amount", "created_at"],
      });

      const chartData = {};
      const monthNames = [
        "Th01",
        "Th02",
        "Th03",
        "Th04",
        "Th05",
        "Th06",
        "Th07",
        "Th08",
        "Th09",
        "Th10",
        "Th11",
        "Th12",
      ];

      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        chartData[`${monthNames[d.getMonth()]} ${d.getFullYear()}`] = 0;
      }

      recentBookingsData.forEach((b) => {
        const d = new Date(b.created_at);
        const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
        if (chartData[key] !== undefined) {
          chartData[key] += Number(b.total_amount);
        }
      });

      const recent5Bookings = await Booking.findAll({
        where: { listing_id: listingIds },
        order: [["created_at", "DESC"]],
        limit: 5,
        include: [
          {
            model: User,
            as: "guest",
            attributes: ["id", "full_name", "avatar_url"],
          },
          { model: Listing, as: "listing", attributes: ["id", "title"] },
        ],
      });

      return successResponse(res, {
        totalRevenue,
        totalBookings,
        pendingBookings,
        chartLabels: Object.keys(chartData),
        chartValues: Object.values(chartData),
        recentBookings: recent5Bookings,
      });
    } catch (e) {
      console.error(e);
      return errorResponse(
        res,
        e.message || "Lấy số liệu thống kê thất bại",
        500,
      );
    }
  },

  // Khách hàng gửi liên hệ cho Chủ nhà
  contactHost: async (req, res) => {
    try {
      const hostId = req.params.id;
      const { email, phone, content } = req.body;

      // Kiểm tra dữ liệu đầu vào
      if (!hostId || !email || !content) {
        return errorResponse(
          res,
          "Vui lòng cung cấp đầy đủ: email và nội dung tin nhắn",
          400,
        );
      }

      const host = await User.findByPk(hostId, {
        attributes: ["id", "email", "full_name"],
      });

      if (!host) {
        return errorResponse(res, "Không tìm thấy chủ nhà", 404);
      }

      // 2. Cấu hình nội dung Email bằng tiếng Việt
      const mailOptions = {
        from: '"Hệ thống Booking BnB" <nguyentiendatg2003@gmail.com>',
        to: host.email,
        subject: `Yêu cầu liên hệ mới từ khách hàng (${email})`,
        html: `
          <div style="font-family: sans-serif; line-height: 1.5;">
            <h2>Chào ${host.full_name},</h2>
            <p>Bạn có một yêu cầu liên hệ mới liên quan đến chỗ nghỉ của bạn trên hệ thống.</p>
            <hr />
            <p><strong>Email người gửi:</strong> ${email}</p>
            <p><strong>Số điện thoại:</strong> ${phone || "Không cung cấp"}</p>
            <p><strong>Nội dung tin nhắn:</strong></p>
            <blockquote style="background: #f9f9f9; padding: 10px; border-left: 5px solid #ccc;">
              ${content}
            </blockquote>
            <hr />
            <p>Vui lòng phản hồi trực tiếp cho khách hàng qua email hoặc số điện thoại trên.</p>
            <p>Trân trọng,<br />Đội ngũ hỗ trợ Booking BnB</p>
          </div>
        `,
      };

      // 3. Thực hiện gửi Mail
      await sendEmail(host.email, `Yêu cầu liên hệ mới từ khách hàng (${email})`, mailOptions.html);


      return successResponse(
        res,
        null,
        "Tin nhắn liên hệ đã được gửi đến chủ nhà thành công",
        200,
      );
    } catch (error) {
      console.error("Lỗi khi gửi email liên hệ:", error);
      return errorResponse(
        res,
        "Gửi email thất bại. Vui lòng thử lại sau.",
        500,
      );
    }
  },
};
