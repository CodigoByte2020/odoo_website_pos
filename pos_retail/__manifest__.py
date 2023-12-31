# -*- coding: utf-8 -*
# TL Technology (thanhchatvn@gmail.com)
# OPL-1 license
# Not allow resale, editing source codes
# License: Base on Odoo Proprietary License v1.0
{
    "price": "600",
    "name": "POS All-In-One(PRO)",
    "version": "1.6.7",
    "category": "Point of Sale",
    "author": "TL Technology",
    "summary":
        """
        Restaurant & Shop Retail All-In-One\n
        Supported Enterprise and Community All-In-One\n
        Included 300+ features All-In-One \n
        """,
    "description":
        """
        1ST POS Application Extend of Point Of Sale Odoo\n
        Supported Enterprise and Community \n
        Included 300+ features of POS \n
        Retail Stores & Restaurant Stores Supported \n\
        """,
    "live_test_url": "http://posodoo.com",
    "website": "http://posodoo.com",
    "sequence": 0,
    "depends": [
        "sale_stock",
        "account",
        "sale_management",
        "hr",
        "bus",
        "stock_account",
        "purchase",
        "product",
        "product_expiry",
        "sale_gift_card",
        "mail",
        "mrp",
        "base_geolocalize",
        "sale_coupon",
        "product_expiry",
        "pos_coupon",
        "pos_restaurant",
        "pos_discount",
        "pos_gift_card",
        "pos_hr",
    ],
    "demo": ["demo/demo_data.xml"],
    "data": [
        "security/ir.model.access.csv",
        "security/group.xml",
        "security/ir_rule.xml",
        # -------------------------------
        "pos_template_page.xml",
        "views/Menu.xml",
        # -------------------------------
        "reports/pos_lot_barcode.xml",
        "reports/pos_sale_analytic.xml",
        "reports/report_pos_order.xml",
        "reports/report_pos_order_pdf.xml",
        "reports/res_partner_card.xml",
        "reports/pos_sale_report_template.xml",
        "reports/pos_sale_report_view.xml",
        "reports/pos_voucher_card.xml",
        "reports/product_barcode.xml",
        "reports/product_pricelist_label.xml",
        "reports/restaurant_table_qrcode.xml",
        "reports/sale_report_templates.xml",
        "reports/product_quantity_available_report.xml",
        "reports/report_stock_excel.xml",
        # -------------------------------
        "datas/product.xml",
        "datas/schedule.xml",
        "datas/email_template.xml",
        "datas/customer.xml",
        "datas/res_partner_type.xml",
        "datas/barcode_rule.xml",
        "datas/pos_loyalty_category.xml",
        "datas/sequence.xml",
        # -------------------------------
        "views/MrpProduction.xml",
        "views/Portal.xml",
        "views/AccountBankStatement.xml",
        "views/PosConfig.xml",
        "views/PosEpson.xml",
        "views/PosIot.xml",
        "views/PosSession.xml",
        "views/ProductTemplate.xml",
        "views/ProductVariant.xml",
        "views/ProductBarcode.xml",
        "views/ProductCollege.xml",
        "views/ProductGenericOption.xml",
        "views/ProductMargin.xml",
        "views/ProductModel.xml",
        "views/ProductPricelist.xml",
        "views/ProductSex.xml",
        "views/ProductBrand.xml",
        "views/PosOrder.xml",
        "views/PosPackOperationLot.xml",
        "views/PosPaymentMethod.xml",
        "views/PosProductDefaultNewCart.xml",
        "views/PosPayment.xml",
        "views/SaleOrder.xml",
        "views/PosLoyalty.xml",
        "views/ResPartnerCredit.xml",
        "views/ResPartnerGroup.xml",
        "views/ResPartnerType.xml",
        "views/ResPartner.xml",
        "views/Restaurant.xml",
        "views/RestaurantPrinter.xml",
        "views/ResUsers.xml",
        "views/PosPromotion.xml",
        "views/AccountJournal.xml",
        "views/AccountMove.xml",
        "views/AccountPayment.xml",
        "views/CustomerFacingDisplay.xml",
        "views/HrEmployee.xml",
        "views/PosVoucher.xml",
        "views/ProductAddons.xml",
        "views/ProductAttributeValue.xml",
        "views/PosBranch.xml",
        "views/PosBackUpOrder.xml",
        "views/PosTag.xml",
        "views/PosNote.xml",
        "views/PosComboItem.xml",
        "views/StockProductionLot.xml",
        "views/StockPicking.xml",
        "views/PosQuicklyPayment.xml",
        "views/PosGlobalDiscount.xml",
        "views/PurchaseOrder.xml",
        "views/ResCompany.xml",
        "views/PosCallLog.xml",
        "views/PosQueryLog.xml",
        "views/PosCategory.xml",
        "views/PosCacheDatabase.xml",
        "views/ProductPackaging.xml",
        "views/PosIot.xml",
        "views/PosSyncSessionLog.xml",
        "views/PosServiceCharge.xml",
        "views/StockLocation.xml",
        "views/StockMove.xml",
        "views/StockWarehouse.xml",
        "views/PosApproveAction.xml",

        "wizards/RemovePosOrder.xml",
        "wizards/PosRemoteSession.xml",
        "wizards/PosBox.xml",
        "wizards/PosMergeOrder.xml",
        "wizards/PosSplitOrder.xml",
    ],
    "qweb": [

    ],
    "currency": "EUR",
    "installable": True,
    "auto_install": True,
    "application": True,
    "external_dependencies": {"python": ["netifaces"]},
    "images": ["static/description/icon.png"],
    "support": "thanhchatvn@gmail.com",
    "license": "OPL-1",
    "post_init_hook": "_auto_clean_cache_when_installed",
    "assets": {
        "point_of_sale.assets": [
            "pos_retail/static/src/css/Primary.scss",
            "pos_retail/static/src/css/*.css",
            "pos_retail/static/src/css/*.scss",

            "pos_retail/static/src/css/Ribbon.css",
            "pos_retail/static/src/css/Core.scss",
            "pos_retail/static/src/css/Receipt.css",
            "pos_retail/static/src/css/Restaurant.css",
            "pos_retail/static/src/css/Custom.css",
            "pos_retail/static/src/css/Loyalty.css",
            "pos_retail/static/src/css/Navigation.css",
            "pos_retail/static/src/css/PopUpProductInfo.css",
            # -------------------------------
            "pos_retail/static/src/libs/idb-keyval.js",
            "pos_retail/static/src/libs/PosIDB.js",
            "pos_retail/static/src/libs/js/instascan.min.js",
            "pos_retail/static/src/libs/js/jquery-license.js",
            "pos_retail/static/src/js/Core/BigData.js",

            "pos_retail/static/src/js/ChromeWidgets/*",
            "pos_retail/static/src/js/Chrome.js",
            "pos_retail/static/src/js/PosComponent.js",
            "pos_retail/static/src/js/Core/BarcodeReader.js",
            "pos_retail/static/src/js/Core/Database.js",
            "pos_retail/static/src/js/Core/LoadModels.js",
            "pos_retail/static/src/js/Core/MobileModeAutomaticChange.js",
            "pos_retail/static/src/js/Core/Models.js",
            "pos_retail/static/src/js/Core/Notification.js",
            "pos_retail/static/src/js/Core/Order.js",
            "pos_retail/static/src/js/Core/Printer.js",
            "pos_retail/static/src/js/Core/PrinterNetwork.js",
            "pos_retail/static/src/js/Core/RemoteSessions.js",
            "pos_retail/static/src/js/Core/RoundingCash.js",
            "pos_retail/static/src/js/Core/SyncBetweenSession.js",

            "pos_retail/static/src/js/CustomerFacingScreen/*",
            "pos_retail/static/src/js/Misc/*",
            "pos_retail/static/src/js/Offline/*",
            "pos_retail/static/src/js/Screens/AccountMove/*",
            "pos_retail/static/src/js/Screens/CheckIn/*",
            "pos_retail/static/src/js/Screens/ProductScreen/CashControl/*",
            "pos_retail/static/src/js/Screens/ProductScreen/ControlButtons/*",
            "pos_retail/static/src/js/Screens/ProductScreen/Cart/*",
            "pos_retail/static/src/js/Screens/ProductScreen/*",
            "pos_retail/static/src/js/PopUps/*",
            "pos_retail/static/src/js/Screens/Restaurant/ControlButtons/*",
            "pos_retail/static/src/js/Screens/Restaurant/ChromeWidgets/*",
            "pos_retail/static/src/js/Screens/Restaurant/FloorScreen/*",
            "pos_retail/static/src/js/Screens/Restaurant/KitchenScreen/*",
            "pos_retail/static/src/js/Screens/Restaurant/QrCodeOrderScreen/*",
            "pos_retail/static/src/js/Screens/Restaurant/RegisterScreen/RegisterScreen.js",
            "pos_retail/static/src/js/Screens/Restaurant/SplitBillScreen/*",
            "pos_retail/static/src/js/Screens/Restaurant/Restaurant.js",
            "pos_retail/static/src/js/Screens/SaleOrder/*",
            "pos_retail/static/src/js/Screens/Payment/*",
            "pos_retail/static/src/js/Screens/Client/*",
            "pos_retail/static/src/js/Screens/GiftCard/*",
            "pos_retail/static/src/js/Screens/LoginScreen/*",
            "pos_retail/static/src/js/Screens/OrderManagementScreen/ControlButtons/ReprintReceiptButton.js",
            "pos_retail/static/src/js/Screens/PosOrder/*",
            "pos_retail/static/src/js/Screens/Report/*",
            "pos_retail/static/src/js/Screens/Ticket/*",
            "pos_retail/static/src/js/Screens/Receipt/*",
        ],
        "web.assets_backend": [
            "pos_retail/static/src/libs/removeDB.js",
            "pos_retail/static/src/libs/bus.js",
            "pos_retail/static/src/libs/WebBackEndEventsRemote.js",
            "pos_retail/static/src/js/Portal/*",
            "pos_retail/static/src/scss/Portal.scss",
        ],
        'point_of_sale.assets_backend_prod_only': [
            'pos_retail/static/src/js/Main.js',
        ],
        "point_of_sale.pos_assets_backend": [

        ],
        "web.assets_qweb": [
            "pos_retail/static/src/xml/Popups/*",
            "pos_retail/static/src/xml/Portal/Portal.xml",
            "pos_retail/static/src/xml/ChromeWidgets/*",
            "pos_retail/static/src/xml/CustomerFacingScreen/*.xml",
            "pos_retail/static/src/xml/Misc/*",
            "pos_retail/static/src/xml/Screens/AccountMove/*",
            "pos_retail/static/src/xml/Screens/CheckIn/*",
            "pos_retail/static/src/xml/Screens/ProductScreen/ControlButtons/*",
            "pos_retail/static/src/xml/Screens/ProductScreen/CashControl/*",
            "pos_retail/static/src/xml/Screens/ProductScreen/Cart/*",
            "pos_retail/static/src/xml/Screens/ProductScreen/*",
            "pos_retail/static/src/xml/Reports/*",
            "pos_retail/static/src/xml/Screens/Login/*",
            "pos_retail/static/src/xml/Screens/OrderManagementScreen/*",
            "pos_retail/static/src/xml/Screens/ClientList/*",
            "pos_retail/static/src/xml/Screens/GiftCard/*",
            "pos_retail/static/src/xml/Screens/Receipt/*",
            "pos_retail/static/src/xml/Screens/Restaurant/ChromeWidgets/*",
            "pos_retail/static/src/xml/Screens/Restaurant/ControlButtons/*",
            "pos_retail/static/src/xml/Screens/Restaurant/FloorScreen/*",
            "pos_retail/static/src/xml/Screens/Restaurant/KitchenScreen/*",
            "pos_retail/static/src/xml/Screens/Restaurant/QrCodeOrderScreen/*",
            "pos_retail/static/src/xml/Screens/Restaurant/Receipt/*",
            "pos_retail/static/src/xml/Screens/Restaurant/RegisterScreen/*",
            "pos_retail/static/src/xml/Screens/Restaurant/SplitBillScreen/*",
            "pos_retail/static/src/xml/Screens/SaleOrder/*",
            "pos_retail/static/src/xml/Screens/PosOrder/*",
            "pos_retail/static/src/xml/Screens/Payment/*",
            "pos_retail/static/src/xml/Reports/*",
            "pos_retail/static/src/xml/Screens/Ticket/*",
            "pos_retail/static/src/libs/xml/*",
            "pos_retail/static/src/xml/Themes.xml",
            "pos_retail/static/src/xml/Chrome.xml",
        ],
    },
}
