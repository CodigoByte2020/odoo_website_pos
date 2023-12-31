odoo.define('pos_retail.ProductScreen', function (require) {
    'use strict';

    const ProductScreen = require('point_of_sale.ProductScreen')
    const Registries = require('point_of_sale.Registries')
    const {posbus} = require('point_of_sale.utils')
    const {useListener} = require('web.custom_hooks')
    const {useState, onMounted} = owl.hooks;
    const models = require('point_of_sale.models')
    const NumberBuffer = require('point_of_sale.NumberBuffer')
    const OrderReceipt = require('point_of_sale.OrderReceipt')
    const core = require('web.core')
    const qweb = core.qweb;
    const {Printer} = require('point_of_sale.Printer');

    const RetailProductScreen = (ProductScreen) => class extends ProductScreen {
        constructor() {
            super(...arguments);
            // if (this.env.pos.config.showFullFeatures == undefined) {
            //     this.env.pos.showFullFeatures = true
            // } else {
            //     this.env.pos.showFullFeatures = this.env.pos.config.showFullFeatures
            // }
            this.state = useState({
                scanBarcode: false,
                openCart: true,
                showButtons: this.env.pos.config.default_show_all_buttons_feature,
                numpadMode: 'quantity',
                mobile_pane: this.props.mobile_pane || 'right',
            })
            this._currentOrder = this.env.pos.get_order();
            if (this._currentOrder) {
                this.env.pos.on('change:selectedOrder', this._updateCurrentOrder, this);
            }
            useListener('remove-selected-customer', this._onRemoveSelectedClient);
            useListener('remove-selected-order', this._onRemoveSelectedOrder);
            useListener('remove-selected-line', this._onRemoveSelectedLine);
            useListener('open-cart', this._openCart);
            useListener('show-buttons', this._openListButtons);
            useListener('print-receipt', this._printReceipt);
            useListener('quickly-paid', this._quicklyPaid);
            NumberBuffer.use({
                triggerProductScreen: 'trigger-product-screen',
                nonKeyboardInputEvent: 'numpad-click-input',
                triggerAtInput: 'update-selected-orderline',
                useWithBarcode: true,
            });
            useListener('trigger-product-screen', this._keyboardHandler);
            useListener('add-custom-sale', this.addCustomSale);
            useListener('clear-cart', this.clearCart);
            useListener('info-cart', this.infoCartSummary);
            onMounted(() => NumberBuffer.reset());
        }

        mounted() {
            super.mounted();
            posbus.on('qr-scanned', this, this._scannedQrCode)
            posbus.on('qr-scanned-return', this, this._scannedQrCodeReturn)
            posbus.on('scan-qrcode-product', this, this._scannedQrProduct)
            if (this.env.pos.barcodeQueue) {
                this._barcodeProductAction(this.env.pos.barcodeQueue)
                this.env.pos.barcodeQueue = null
            }
            let product_ids = this.env.pos.db.product_ids
            console.log('>>>>>> render products: ' + product_ids.length)
        }

        willUnmount() {
            super.willUnmount()
            posbus.off('qr-scanned', this, null)
            posbus.off('qr-scanned-return', this, null)
            posbus.off('scan-qrcode-product', this, null)
        }

        async _scannedQrCode(code) {
            let selectedOrder = this.env.pos.get_order()
            const orders = this.env.pos.get('orders');
            if (selectedOrder.orderlines.models.length != 0) {
                selectedOrder = new models.Order({}, {pos: this.env.pos, temporary: true});
                orders.add(selectedOrder);
                this.env.pos.set('selectedOrder', selectedOrder);
            }
            if (selectedOrder.orderlines.length == 0) {
                let datas = code.split(";")
                for (let i = 0; i < datas.length; i++) {
                    let values = datas[i].split(':')
                    let product_id = parseInt(values[0])
                    let quantity = parseFloat(values[1])
                    let discount = parseFloat(values[2])
                    if (discount == 'N/A') {
                        discount = 0
                    }
                    let price = parseFloat(values[3])
                    let notes = values[4]
                    if (discount == 'N/A') {
                        notes = ""
                    }
                    let product = this.env.pos.db.get_product_by_id(product_id)
                    if (product) {
                        selectedOrder.add_product(product, {
                            quantity: quantity, price: price, discount: discount,
                        })
                    }
                }
            }
        }

        async _scannedQrCodeReturn(code) {
            let selectedOrder = this.env.pos.get_order()
            const orders = this.env.pos.get('orders');
            if (selectedOrder.orderlines.models.length != 0) {
                selectedOrder = new models.Order({}, {pos: this.env.pos, temporary: true});
                orders.add(selectedOrder);
                this.env.pos.set('selectedOrder', selectedOrder);
            }
            if (selectedOrder.orderlines.length == 0) {
                let datas = code.split(";")
                for (let i = 0; i < datas.length; i++) {
                    let values = datas[i].split(':')
                    let product_id = parseInt(values[0])
                    let quantity = parseFloat(values[1])
                    let discount = parseFloat(values[2])
                    if (discount == 'N/A') {
                        discount = 0
                    }
                    let price = parseFloat(values[3])
                    let notes = values[4]
                    if (discount == 'N/A') {
                        notes = ""
                    }
                    let product = this.env.pos.db.get_product_by_id(product_id)
                    if (product) {
                        selectedOrder.add_product(product, {
                            quantity: -quantity, price: price, discount: discount,
                        })
                    }
                }
            }
        }

        // TODO: any scan code
        async _barcodeProductAction(code) {
            console.log('_barcodeProductAction with code: ' + code)
            this.state.scanBarcode = true
            const self = this
            let product = this.env.pos.db.get_product_by_barcode(code.base_code)
            if (product) {
                let packsOfProduct = this.env.pos.packaging_by_product_id[product.id]
                if (packsOfProduct) {
                    console.warn('>>>>>>>>>>>>> product have packing, auto go to method _barcodeErrorAction for add packing')
                    return this._barcodeErrorAction(code)
                }
            }
            if (this.env.pos.networkCrashed && !product) {
                return this._barcodeErrorAction(code);
            } else {
                return await super._barcodeProductAction(code)
            }
            setTimeout(() => {
                self.state.scanBarcode = false
            }, 200)
            return false
        }

        async _scannedQrProduct(code) {
            const selectedOrder = this.env.pos.get_order()
            let codes = code.split(';')
            let codeFound = false
            for (let i = 0; i < codes.length; i++) {
                let products = this.env.pos.db.search_product_in_category(0, code);
                if (!products || products.length == 0) {
                    continue
                }
                if (products.length == 1) {
                    let productFound = products[0]
                    let options = await this._getAddProductOptions(productFound);
                    selectedOrder.add_product(productFound, options)
                    codeFound = true
                    break
                }
            }
            if (!codeFound) {
                this.showPopup('ErrorBarcodePopup', {code: code});
            }
        }

        _openListButtons() {
            this.state.showButtons = !this.state.showButtons
        }

        async validateMinimumPriceOfItemsInCart() {
            let selectedOrder = this.env.pos.get_order()
            if (this.env.pos.user.role == 'manager') {
                this.env.pos.alert_message({
                    title: this.env._t('Alert'),
                    body: this.env._t('You are is role Manager (Point Of Sale Manager), by pass checking minimum Price')
                })
                return true
            }
            if (this.env.pos.config.validate_minimum_price && this.env.pos.user.role != 'manager') {
                for (let i = 0; i < selectedOrder.orderlines.models.length; i++) {
                    let line = selectedOrder.orderlines.models[i]
                    if (line.waitingApproveId) {
                        let requestStatus = await selectedOrder.validateRequestApproveOrNot(line.uid)
                        if (!requestStatus) {
                            this.showPopup('ErrorPopup', {
                                title: this.env._t('Warning, price of Product: ') + line.product.display_name + this.env._t(' need Approve'),
                                body: this.env._t("You need Request Manager approve Action ID ") + line.uid + this.env._t(' . With id: ') + line.waitingApproveId
                            })
                            return false
                        } else {
                            continue
                        }
                    }
                    let warningMessage = line.verifyMinimumPriceOfProduct(line.product.get_price(), line.price)
                    if (warningMessage) {
                        const action = this.env._t('Need approve Price of product: ') + line.product.display_name
                        const description = line.product.display_name + this.env._t(' have Price smaller than Minimum Price of Product [') + this.env.pos.format_currency(line.product.minimum_price)
                        const action_strId = line.uid
                        const type = 'price_change'
                        const waitingApproveId = await selectedOrder._requestApproveAction(action, description, action_strId, type, line.product.id)
                        line.waitingApproveId = waitingApproveId
                        this.showPopup('ErrorPopup', {
                            title: this.env._t('Warning, price of Product: ') + line.product.display_name + this.env._t(' need Approve'),
                            body: this.env._t("You need Request Manager approve Action ID ") + line.uid + this.env._t(' . With id: ') + line.waitingApproveId
                        })
                        line.trigger('change', line)
                        return false
                    } else {
                        line.waitingApproveId = null
                        line.trigger('change', line)
                    }
                }
            }
            return true
        }

        async _printReceipt() {
            console.log('>>>>>>>>>>>>>> pre print _printReceipt()')
            if (!this.env.pos.config.review_receipt_before_paid) {
                return this.env.pos.alert_message({
                    title: this.env._t('Warning'),
                    body: this.env._t('Your POS have not active Print Receipt Before Payment, please contact your Admin !!!')
                })
            }
            const order = this.env.pos.get_order()
            if (!order) return
            if (order.orderlines.length == 0) {
                return this.env.pos.alert_message({
                    title: this.env._t('Error'), body: this.env._t('Your order cart is blank')
                })
            }
            if (!await this.validateMinimumPriceOfItemsInCart()) {
                return true
            }
            // TODO: 20/7/2022 removed it. No need print bill kitchen on receipt bill
            // const changes = this._currentOrder.hasChangesToPrint(); // TODO: Only for Restaurant, when cashier get draft bill, we print all request to printer
            // order.orderlines.models.forEach(l => { // TODO: set skipped to fail
            //     if (l.mp_dbclk_time != 0 && l.mp_skip) {
            //         this.mp_dbclk_time = 0
            //         l.set_skip(false) // skipped is Product is Main Course
            //     }
            // })
            // let printers = this.env.pos.printers;
            // let orderRequest = null
            // for (let i = 0; i < printers.length; i++) {
            //     let printer = printers[i];
            //     let changes = order.computeChanges(printer.config.product_categories_ids);
            //     if (changes['new'].length > 0 || changes['cancelled'].length > 0) {
            //         let orderReceipt = order.buildReceiptKitchen(changes);
            //         orderRequest = orderReceipt
            //         order.saveChanges();
            //         if ((order.syncing == false || !order.syncing) && this.env.pos.pos_bus && !this.env.pos.splitbill) {
            //             this.env.pos.pos_bus.requests_printers.push({
            //                 action: 'request_printer', data: {
            //                     uid: order.uid, computeChanges: orderReceipt,
            //                 }, order_uid: order.uid,
            //             })
            //         }
            //     }
            // }
            const orderRequest = null
            const isBill = true
            const fixture = document.createElement('div')
            const orderReceipt = new (Registries.Component.get(OrderReceipt))(null, {order, orderRequest, isBill})
            await orderReceipt.mount(fixture)
            const receiptHtml = orderReceipt.el.outerHTML
            const report_xml = qweb.render('XmlReceipt', order.get_receipt_render_env())
            if (this.env.pos.config.bluetooth_printer) {
                const cashIsOpen = order.is_paid_with_cash() || order.get_change()
                const printer = new Printer(null, this.env.pos)
                const xhttp = new XMLHttpRequest()
                const receiptString = receiptHtml
                const ticketImage = await printer.htmlToImg(receiptString)
                xhttp.open("POST", "http://" + this.env.pos.config.bluetooth_device_ip_address + ":9200", true);
                let receiptObj = {}
                const copie = this.env.pos.config.bluetooth_receipt_copies;
                receiptObj = {
                    image: ticketImage, text: "------ Bill Draft ------", "openCashDrawer": !!cashIsOpen, copies: 1
                }
                const receiptJSON = JSON.stringify(receiptObj)
                xhttp.send(receiptJSON)
                return true
            } else {
                if (this.env.pos.proxy.printer) {
                    this.env.pos.proxy.printer.print_receipt(receiptHtml)
                } else {
                    this.showScreen('ReportScreen', {
                        report_html: receiptHtml, report_xml: null,
                    })
                }
            }
            // const report_xml = qweb.render('XmlReceipt', order.get_receipt_render_env())
            // TODO: print direct printer via receipt format xml
            // --------------------------------------------------
            // if (this.env.pos.proxy.printer && this.env.pos.config.proxy_ip) {
            //     this.env.pos.proxy.printer.print_xml_receipt(report_xml)
            // } else {
            //     this.showScreen('ReportScreen', {
            //         report_html: receiptHtml,
            //         report_xml: report_xml,
            //     });
            // }


            order.pre_print = true
            order.trigger('change')
            if (order.get_allow_sync() && order.table && this.env.pos.config.allow_payment) {
                this.env.pos.pos_bus.send_notification({
                    data: {
                        order: order.export_as_JSON(), table_id: order.table.id, order_uid: order.uid, lock: true,
                    }, action: 'lock_table', order_uid: order.uid,
                })
            }
        }

        async addCustomSale() {
            let {confirmed, payload: productName} = await this.showPopup('TextAreaPopup', {
                title: this.env._t('What a Custom Sale (Product Name)'), startingValue: ''
            })
            if (confirmed) {
                let product = this.env.pos.db.get_product_by_id(this.env.pos.config.custom_sale_product_id[0]);
                if (product) {
                    let {confirmed, payload: number} = await this.showPopup('NumberPopup', {
                        'title': this.env._t('What Price of ') + productName, 'startingValue': 0,
                    });
                    if (confirmed) {
                        const selectedOrder = this.env.pos.get_order()
                        product.display_name = productName
                        selectedOrder.add_product(product, {
                            price_extra: 0, price: parseFloat(number), quantity: 1, merge: false,
                        })
                        let selectedLine = selectedOrder.get_selected_orderline()
                        selectedLine.set_full_product_name(productName)
                        this.showPopup('ConfirmPopup', {
                            title: productName + this.env._t(' add to Cart'),
                            body: this.env._t('You can modifiers Price and Quantity of Item'),
                            disableCancelButton: true,
                        })
                    }

                } else {
                    this.showPopup('ErrorPopup', {
                        title: this.env._t('Warning'),
                        body: this.env.pos.config.custom_sale_product_id[1] + this.env._t(' not Available In POS'),
                    })
                }
            }
        }

        async infoCartSummary() {
            let values = {};
            let selectedOrder = this.env.pos.get_order();
            if (selectedOrder.orderlines.models.length == 0) {
                return this.showPopup('ErrorPopup', {
                    title: this.env._t('Warning'),
                    body: this.env._t('Your Cart is blank, can not show Cart Summary Items by each Category'),
                    disableCancelButton: true,
                })
            }
            for (let i = 0; i < selectedOrder.orderlines.models.length; i++) {
                let line = selectedOrder.orderlines.models[i]
                let product = line.product
                let base_categ_id = product.pos_categ_id ? product.pos_categ_id[0] : this.env.pos.db.root_category_id
                let category = this.env.pos.db.category_by_id[base_categ_id]
                if (!values[category.name]) {
                    values[category.name] = line.quantity
                } else {
                    values[category.name] += line.quantity
                }
            }
            let lists = []
            for (let categ in values) {
                lists.push({
                    id: categ, label: this.env.pos.format_currency_no_symbol(values[categ]) + ' - ' + categ, item: categ
                })
            }
            this.showPopup('SelectionPopup', {
                title: this.env._t('Cart Summary Items [Quantity - Category]'), list: lists, disableKeyboard: true,
            })
        }

        async clearCart() {
            if (this.env.pos.config.allow_remove_line) {
                let selectedOrder = this.env.pos.get_order();
                if (selectedOrder.orderlines.models.length > 0) {
                    let {confirmed, payload: result} = await this.showPopup('ConfirmPopup', {
                        title: this.env._t('Warning !!!'), body: this.env._t('Are you want remove all Items in Cart ?')
                    })
                    if (confirmed) {
                        selectedOrder.orderlines.models.forEach(l => selectedOrder.remove_orderline(l))
                        selectedOrder.orderlines.models.forEach(l => selectedOrder.remove_orderline(l))
                        selectedOrder.orderlines.models.forEach(l => selectedOrder.remove_orderline(l))
                        selectedOrder.orderlines.models.forEach(l => selectedOrder.remove_orderline(l))
                        selectedOrder.is_return = false;
                        this.env.pos.alert_message({
                            title: this.env._t('Successfully'), body: this.env._t('Order is empty cart !')
                        })
                    }
                } else {
                    this.env.pos.alert_message({
                        title: this.env._t('Warning !!!'), body: this.env._t('Your Order Cart is blank.')
                    })
                }
            }
        }

        async _quicklyPaid() {
            let {confirmed, payload: result} = await this.showPopup('ConfirmPopup', {
                title: this.env._t('Warning !!!'), body: this.env._t('Are you want Quickly Paid Order ?')
            })
            const self = this;
            const selectedOrder = this.env.pos.get_order();
            if (selectedOrder.orderlines.length == 0) {
                return this.env.pos.alert_message({
                    title: this.env._t('Error'), body: this.env._t('Your order cart is blank')
                })
            }
            if (!this.env.pos.config.allow_order_out_of_stock) {
                const quantitiesByProduct = selectedOrder.product_quantity_by_product_id()
                let isValidStockAllLines = true;
                for (let n = 0; n < selectedOrder.orderlines.models.length; n++) {
                    let l = selectedOrder.orderlines.models[n];
                    let currentStockInCart = quantitiesByProduct[l.product.id]
                    if (l.product.type == 'product' && l.product.qty_available < currentStockInCart) {
                        isValidStockAllLines = false
                        this.env.pos.alert_message({
                            title: this.env._t('Error'),
                            body: l.product.display_name + this.env._t(' not enough for sale. Current stock on hand only have: ') + l.product.qty_available,
                            timer: 10000
                        })
                    }
                }
                if (!isValidStockAllLines) {
                    return false;
                }
            }
            if (selectedOrder.is_to_invoice() && !selectedOrder.get_client()) {
                this.showPopup('ConfirmPopup', {
                    title: this.env._t('Warning'),
                    body: this.env._t('Order will process to Invoice, please select one Customer for set to current Order'),
                    disableCancelButton: true,
                })
                const {confirmed, payload: newClient} = await this.showTempScreen('ClientListScreen', {
                    client: null, body: this.env._t('Required Customer')
                });
                if (confirmed) {
                    selectedOrder.set_client(newClient);
                } else {
                    return this.env.pos.alert_message({
                        title: this.env._t('Error'),
                        body: this.env._t('Order will processing to Invoice, required set a Customer')
                    })
                }
            }
            let hasValidMinMaxPrice = selectedOrder.isValidMinMaxPrice()
            if (!hasValidMinMaxPrice) {
                return false
            }
            const linePriceSmallerThanZero = selectedOrder.orderlines.models.find(l => l.get_price_with_tax() <= 0 && !l.promotion)
            if (this.env.pos.config.validate_return && linePriceSmallerThanZero) {
                let validate = await this.env.pos._validate_action(this.env._t('Have one Line has Price smaller than or equal 0. Need Manager Approve'));
                if (!validate) {
                    return false;
                }
            }
            if (this.env.pos.config.validate_payment) {
                let validate = await this.env.pos._validate_action(this.env._t('Need approve Payment'));
                if (!validate) {
                    return false;
                }
            }
            if (selectedOrder.get_total_with_tax() <= 0 || selectedOrder.orderlines.length == 0) {
                return this.env.pos.alert_message({
                    title: this.env._t('Error'),
                    body: this.env._t('Your Order is Empty or Total Amount smaller or equal 0')
                })
            }
            if (!this.env.pos.config.quickly_payment_method_id) {
                return this.env.pos.alert_message({
                    title: this.env._t('Error'),
                    body: this.env._t('Your POS Config not set Quickly Payment Method, please go to Tab [Payment Screen] of POS Config and full fill to [Quickly Payment with Method]')
                })
            }
            let quickly_payment_method = this.env.pos.payment_methods.find(m => m.id == this.env.pos.config.quickly_payment_method_id[0])
            if (!quickly_payment_method) {
                return this.env.pos.alert_message({
                    title: this.env._t('Error'),
                    body: this.env._t('You POS Config active Quickly Paid but not set add Payment Method: ') + this.env.pos.config.quickly_payment_method_id[1] + this.env._t('Payments/ Payment Methods')
                })
            }
            let paymentLines = selectedOrder.paymentlines.models
            paymentLines.forEach(function (p) {
                selectedOrder.remove_paymentline(p)
            })
            selectedOrder.add_paymentline(quickly_payment_method);
            var paymentline = selectedOrder.selected_paymentline;
            paymentline.set_amount(selectedOrder.get_total_with_tax());
            selectedOrder.trigger('change', selectedOrder);
            const validate_order_without_receipt = this.env.pos.config.validate_order_without_receipt;
            const iface_print_auto = this.env.pos.config.iface_print_auto;
            this.env.pos.config.validate_order_without_receipt = true
            this.env.pos.config.iface_print_auto = true
            let order_ids = this.env.pos.push_single_order(selectedOrder, {})
            console.log('[quicklyPaidOrder] pushed succeed order_ids: ' + order_ids)
            this.showScreen('ReceiptScreen');
            setTimeout(function () {
                self.env.pos.config.validate_order_without_receipt = validate_order_without_receipt
                self.env.pos.config.iface_print_auto = iface_print_auto
            }, 2000)
        }

        async _barcodeErrorAction(code) {
            const codeScan = code.code
            console.warn('not found code:' + code.code)
            let resultScanPricelist = await this._scanPricelistCode(codeScan)
            if (resultScanPricelist) {
                this.trigger('close-popup')
                return true
            }
            let resultScanLot = await this._barcodeLotAction(codeScan)
            if (resultScanLot) {
                this.trigger('close-popup')
                return true
            }
            let modelScan = await this.env.pos.scan_product(code)
            if (!modelScan) {
                return super._barcodeErrorAction(code)
            } else {
                return true
            }
        }

        async _getAddProductOptions(product, base_code) {
            let price_extra = 0.0;
            let draftPackLotLines, weight, description, packLotLinesToEdit;
            if (this.env.pos.config.fullfill_lots && ['serial', 'lot'].includes(product.tracking) && (this.env.pos.picking_type.use_create_lots || this.env.pos.picking_type.use_existing_lots)) {
                let currentStockLocation = this.env.pos.get_source_stock_location()
                let quants = await this.rpc({
                    model: 'stock.quant',
                    method: 'search_read',
                    domain: [['product_id', '=', product.id], ['available_quantity', '>', 0], ['location_id', '=', currentStockLocation.id]],
                    fields: ['lot_id', 'removal_date', 'inventory_date']
                })
                let lot_ids = []
                quants.forEach(l => lot_ids.push(l['lot_id'][0]))
                if (lot_ids.length > 0) {
                    let packLotLinesToEdit = await this.rpc({
                        model: 'stock.production.lot',
                        method: 'search_read',
                        domain: [['id', 'in', lot_ids], ['product_qty', '>', 0]],
                        fields: ['name', 'expiration_date', 'product_qty']
                    })
                    if (!packLotLinesToEdit) {
                        packLotLinesToEdit = this.env.pos.lots.filter(l => l.product_id && l.product_id[0] == product['id'])
                    } else {
                        packLotLinesToEdit = packLotLinesToEdit.sort(this.env.pos.sort_by('expiration_date', false, function (a) {
                            if (!a) {
                                a = 'N/A'
                            }
                            return a.toUpperCase()
                        }))
                    }
                    if (packLotLinesToEdit && packLotLinesToEdit.length) {
                        packLotLinesToEdit.forEach((l) => l.text = l.name);
                        const lotList = packLotLinesToEdit.map(l => ({
                            id: l.id,
                            item: l,
                            label: l.name + this.env._t(' Stock : ') + l.product_qty + this.env._t(', Expired Date: ') + (l.expiration_date || 'N/A')
                        }))
                        const selectedLot = [lotList[0]['item']]
                        const newPackLotLines = selectedLot
                            .filter(item => item.id)
                            .map(item => ({lot_name: item.name}));
                        const modifiedPackLotLines = selectedLot
                            .filter(item => !item.id)
                            .map(item => ({lot_name: item.text}));
                        draftPackLotLines = {modifiedPackLotLines, newPackLotLines};
                    }
                    return {draftPackLotLines, quantity: weight, description, price_extra};
                } else {
                    return super._getAddProductOptions(product, base_code)
                }
            } else {
                return super._getAddProductOptions(product, base_code)
            }
        }

        async _scanPricelistCode(code) {
            let pricelist = this.env.pos.pricelists.find(p => p.barcode == code)
            if (pricelist) {
                const selectedOrder = this.env.pos.get_order()
                selectedOrder.set_pricelist(pricelist)
                this.env.pos.alert_message({
                    title: this.env._t('Successfully'), body: pricelist.name + this.env._t(' set to Order')
                })
                return true
            }
            return false
        }

        async _barcodeLotAction(code) {
            const self = this
            const selectedOrder = this.env.pos.get_order();
            let lots = this.env.pos.lots.filter(l => l.barcode == code || l.name == code)
            lots = _.filter(lots, function (lot) {
                let product_id = lot.product_id[0];
                let product = self.env.pos.db.product_by_id[product_id];
                return product != undefined
            });
            if (lots && lots.length) {
                if (lots.length > 1) {
                    const list = lots.map(l => ({
                        label: this.env._t('Lot Name: ') + l.name + this.env._t(' with quantity ') + l.product_qty,
                        item: l,
                        id: l.id
                    }))
                    let {confirmed, payload: lot} = await this.showPopup('SelectionPopup', {
                        title: this.env._t('Select Lot Serial'), list: list,
                    });
                    if (confirmed) {
                        let productOfLot = this.env.pos.db.product_by_id[lot.product_id[0]]
                        selectedOrder.add_product(productOfLot, {merge: false})
                        let order_line = selectedOrder.get_selected_orderline()
                        if (order_line) {
                            if (lot.replace_product_public_price && lot.public_price) {
                                order_line.set_unit_price(lot['public_price'])
                                order_line.price_manually_set = true
                            }
                            const modifiedPackLotLines = {}
                            const newPackLotLines = [{
                                lot_name: lot.name
                            }]
                            order_line.setPackLotLines({modifiedPackLotLines, newPackLotLines});
                            return true
                        } else {
                            return false
                        }
                    } else {
                        return false
                    }
                } else {
                    const selectedLot = lots[0]
                    let productOfLot = this.env.pos.db.product_by_id[selectedLot.product_id[0]]
                    const newPackLotLines = lots
                        .filter(item => item.id)
                        .map(item => ({lot_name: item.name}))
                    const modifiedPackLotLines = lots
                        .filter(item => !item.id)
                        .map(item => ({lot_name: item.text}))
                    this.env.pos.alert_message({
                        title: this.env._t('Barcode of Lot/Serial'),
                        body: this.env._t('For Product: ') + productOfLot.display_name
                    })
                    const draftPackLotLines = {modifiedPackLotLines, newPackLotLines}
                    selectedOrder.add_product(productOfLot, {
                        draftPackLotLines, price_extra: 0, quantity: 1, merge: false,
                    })
                    return true
                }
            } else {
                return false
            }
        }

        _openCart() {
            this.state.openCart = !this.state.openCart
        }

        get getMaxWidthLeftScreen() {
            if (this.env.isMobile) {
                return 'unset !important'
            } else {
                return this.env.session.config.cart_width + '% !important'
            }
        }

        _onMouseEnter(event) {
            $(event.currentTarget).css({'width': '450px'})
        }

        _onMouseLeave(event) {
            $(event.currentTarget).css({'width': '150px'})
        }

        get nextScreen() {
            if (this.env.pos.config.module_pos_restaurant && this.env.pos.config.iface_floorplan) {
                const table = this.env.pos.table;
                return {name: 'FloorScreen', props: {floor: table ? table.floor : null}};
            } else {
                return {name: 'ProductScreen'}
            }
        }

        async _onRemoveSelectedOrder() {
            const selectedOrder = this.env.pos.get_order();
            if (!this.env.pos.config.allow_remove_order && !selectedOrder['temporary']) {
                return this.showPopup('ErrorPopup', {
                    title: this.env._t('Error'), body: this.env._t('Your POS have not allow you remove the Order')
                });
            }
            if (this.env.pos.config.validate_remove_order && !selectedOrder['temporary']) {
                let validate = await this.env.pos._validate_action(this.env._t('Delete this Order'));
                if (!validate) {
                    return false;
                }
            }
            let {confirmed, payload: note} = await this.showPopup('TextAreaPopup', {
                title: this.env._t('Please input Remove Reason'),
                body: `${selectedOrder.name} has total amount of ${this.env.pos.format_currency(selectedOrder.get_total_with_tax())}, are you sure you want delete this order?`,
            });
            if (!confirmed) {
                return
            } else {
                if (!note) {
                    return this.showPopup('ErrorPopup', {
                        title: this.env._t('Warning'), body: this.env._t('Reason for remove Order is required !'),
                    })
                }
                await selectedOrder._setOrdertoCancel(note)
                selectedOrder.destroy({reason: 'abandon'});
                posbus.trigger('order-deleted')
                const {name, props} = this.nextScreen;
                this.showScreen(name, props);
            }
        }

        async _onRemoveSelectedLine() {
            const selectedOrder = this.env.pos.get_order()
            if (selectedOrder && selectedOrder.get_selected_orderline()) {
                const selecteLine = selectedOrder.get_selected_orderline()
                let {confirmed, payload: result} = await this.showPopup('ConfirmPopup', {
                    title: this.env._t('Remove selected line ?'),
                    body: this.env._t('Are you want remove selected Line'),
                    cancelText: this.env._t('Close'),
                    confirmText: this.env._t('Remove')
                })
                if (confirmed) {
                    selectedOrder.remove_orderline(selecteLine);
                }
            }
        }

        async _onRemoveSelectedClient() {
            const selectedOrder = this.env.pos.get_order();
            if (selectedOrder) {
                const lastClientSelected = selectedOrder.get_client()
                selectedOrder.set_client(null);
                if (!lastClientSelected) {
                    this.env.pos.chrome.showNotification(this.env._t('Alert'), this.env._t('Order blank Customer'))
                    return true
                }
                this.env.pos.chrome.showNotification(lastClientSelected['name'], this.env._t(' Deselected, out of Order'))
            }
        }

        get blockScreen() {
            const selectedOrder = this.env.pos.get_order();
            if (!selectedOrder || !selectedOrder.is_return) {
                return false
            } else {
                return true
            }
        }

        get allowDisplayListFeaturesButton() {
            return true
        }

        get blockScreen() {
            const selectedOrder = this.env.pos.get_order();
            if (!selectedOrder || !selectedOrder.is_return) {
                return false
            } else {
                return true
            }
        }

        switchPane() {
            super.switchPane()
        }

        _setValue(val) {
            if (this.currentOrder.finalized) {
                console.warn('[Screen products state is not Products] or [Order is finalized] reject trigger event keyboard]')
                return false
            } else {
                super._setValue(val)
            }
            this.currentOrder.trigger('update-rewards');
        }

        async _keyboardHandler(event) {
            const selectedOrder = this.env.pos.get_order()
            if (!selectedOrder) {
                return false
            }
            const selecteLine = selectedOrder.get_selected_orderline()
            const keyName = event.detail.key
            console.log('[ Key Name ] : ' + keyName)
            if (this.state.scanBarcode) {
                console.log('[ Scan barcode direct scanner to compute ] reject event keyboard ')
                return false
            }
            if (keyName == "Control" && selecteLine) {
                let uom_items = this.env.pos.uoms_prices_by_product_tmpl_id[selecteLine.product.product_tmpl_id];
                if (uom_items) {
                    let list = uom_items.map((u) => ({
                        id: u.id, label: u.uom_id[1], item: u
                    }));
                    let {confirmed, payload: unit} = await this.showPopup('SelectionPopup', {
                        title: this.env._t('Select Unit of Measure for : ') + selecteLine.product.display_name,
                        list: list
                    })
                    if (confirmed) {
                        selecteLine.set_unit(unit.uom_id[0], unit.price)
                    }
                }
            }
            if (keyName == "ArrowRight" || keyName == "Enter") {
                await this._onClickPay()
            }
            if (keyName == "ArrowUp" || keyName == "ArrowDown") {
                debugger
                if (selecteLine) {
                    for (let i = 0; i < selectedOrder.orderlines.models.length; i++) {
                        let line = selectedOrder.orderlines.models[i]
                        if (line.cid == selecteLine.cid) {
                            let line_number = null;
                            if (keyName == "ArrowUp") {
                                if (i == 0) {
                                    line_number = selectedOrder.orderlines.models.length - 1
                                } else {
                                    line_number = i - 1
                                }
                            } else {
                                if (i + 1 >= selectedOrder.orderlines.models.length) {
                                    line_number = 0
                                } else {
                                    line_number = i + 1
                                }
                            }
                            selectedOrder.select_orderline(selectedOrder.orderlines.models[line_number])
                        }
                    }
                }
            }
            if (keyName == "a") {
                $('.search-customer-direct').focus()
            }
            if (keyName == "c") {
                this._onClickCustomer()
            }
            if (keyName == "d") {
                this.trigger('set-numpad-mode', {mode: 'discount'});
            }
            if (keyName == "p") {
                this.trigger('set-numpad-mode', {mode: 'price'});
            }
            if (keyName == "q") {
                this.trigger('set-numpad-mode', {mode: 'quantity'});
            }
            if (keyName == "h") {
                $('.go-home').click()
            }
            if (keyName == "l") {
                $('.close_button').click()
            }
            // if (keyName == "Tab") {
            //     $('.change-product-view').click()
            // }
            if (keyName == "n") {
                let {confirmed, payload: result} = await this.showPopup('ConfirmPopup', {
                    title: this.env._t('Create new Order ?'),
                    body: this.env._t('Are you want add new Order'),
                    cancelText: this.env._t('Yes'),
                    confirmText: this.env._t('Cancel')
                })
                if (confirmed) {
                    this.env.pos.add_new_order()
                }
            }
            if (keyName == "o") {
                this._openCart()
            }
            if (keyName == "Escape") {
                let {confirmed, payload: result} = await this.showPopup('ConfirmPopup', {
                    title: this.env._t('Remove Order ?'),
                    body: this.env._t('Are you want remove current Order ?'),
                    cancelText: this.env._t('Yes'),
                    confirmText: this.env._t('Cancel')
                })
                if (confirmed) {
                    this.trigger('remove-selected-order')
                }
            }
            if (keyName == "`" && this.env.pos.config.allow_remove_line && selecteLine) {
                await this._onRemoveSelectedLine()
            }
            if (keyName == "f") {
                $('.filter').click()
            }
            if (keyName == "s") {
                $('.search >input')[0].focus()
            }
            if (keyName == "=" && selecteLine) {
                selecteLine.set_quantity(selecteLine.quantity + 1)
            }
            if (keyName == "-" && selecteLine) {
                let newQty = selecteLine.quantity - 1
                selecteLine.set_quantity(newQty)
            }
            if (keyName == "F1") {
                this.trigger('show-buttons')
            }
            if (keyName == "F2") {
                this.addCustomSale()
            }
            if (keyName == "F3") {
                this.trigger('clear-cart')
            }
            if (keyName == "F4") {
                $('.search-customer-direct').focus()
            }
            if ((keyName == "F6") && this.env.pos.config.review_receipt_before_paid) {
                this._printReceipt()
            }
            if (keyName == "F7") {
                this._quicklyPaid()
            }
            if (keyName == "F8") {
                $('.orders-header-button').click()
            }
            if (keyName == "F9") {
                $('.gift-card').click()
            }
            if (keyName == "F10") {
                $('.sale-orders-header-button').click()
            }
            if (keyName == "F11") {
                $('.pos-orders-header-button').click()
            }
            if (keyName == "F12") {
                $('.invoices-header-button').click()
            }
        }

        async _validateMode(mode) {
            if (mode == 'discount' && (!this.env.pos.config.allow_numpad || !this.env.pos.config.allow_discount || !this.env.pos.config.manual_discount)) {
                this.env.pos.alert_message({
                    title: this.env._t('Alert'), body: this.env._t('You have not Permission change Discount')
                })
                return false;
            }
            if (mode == 'quantity' && (!this.env.pos.config.allow_numpad || !this.env.pos.config.allow_qty)) {
                this.env.pos.alert_message({
                    title: this.env._t('Alert'), body: this.env._t('You have not Permission change Quantity')
                })
                return false;
            }
            if (mode == 'price' && (!this.env.pos.config.allow_numpad || !this.env.pos.config.allow_price)) {
                this.env.pos.alert_message({
                    title: this.env._t('Alert'), body: this.env._t('You have not Permission change Quantity')
                })
                return false;
            }
            return true
        }

        async _newOrderlineSelected() {
            await super._newOrderlineSelected()
            posbus.trigger('numpad-change-mode', {detail: {mode: 'quantity'}}) // TODO: send mode updated to OpenCartAction
        }

        async _setNumpadMode(event) {
            const selectedOrder = this.env.pos.get_order()
            const selecteLine = selectedOrder.get_selected_orderline()
            const {mode} = event.detail
            const validate = await this._validateMode(mode)
            if (validate) {
                if (this.env.pos.config.discount_value_dynamic && selecteLine && mode == 'discount') {
                    let {confirmed, payload: result} = await this.showPopup('ConfirmPopup', {
                        title: this.env._t('Alert'), body: this.env._t('Are you want set Discount Value ?'),
                    })
                    if (confirmed) {
                        let {confirmed, payload: number} = await this.showPopup('NumberPopup', {
                            title: this.env._t('Please set the Discount Value'), startingValue: 0,
                        })
                        if (confirmed) {
                            if (number < selecteLine.price) {
                                return selecteLine.set_price_extra(-number)
                            } else {
                                return this.showPopup('ErrorPopup', {
                                    title: this.env._t('Warning'),
                                    body: this.env._t('You can not set discount value bigger than or equal price of item'),
                                })
                            }
                        }
                    }
                }
                await super._setNumpadMode(event)
                posbus.trigger('numpad-change-mode', event) // TODO: send mode updated to OpenCartAction
            }
        }

        async autoAskPaymentMethod() {
            const selectedOrder = this.env.pos.get_order();
            if (selectedOrder.is_return) {
                return this.showScreen('PaymentScreen')
            }
            if (selectedOrder.is_to_invoice() && !selectedOrder.get_client()) {
                this.showPopup('ConfirmPopup', {
                    title: this.env._t('Warning'),
                    body: this.env._t('Order will process to Invoice, please select one Customer for set to current Order'),
                    disableCancelButton: true,
                })
                const {confirmed, payload: newClient} = await this.showTempScreen('ClientListScreen', {
                    client: null, body: this.env._t('Required Customer')
                });
                if (confirmed) {
                    selectedOrder.set_client(newClient);
                } else {
                    return this.autoAskPaymentMethod()
                }
            }
            if (selectedOrder && (selectedOrder.paymentlines.length == 0 || (selectedOrder.paymentlines.length == 1 && selectedOrder.paymentlines.models[0].payment_method.pos_method_type == 'rounding'))) {
                const paymentMethods = this.env.pos.normal_payment_methods.map(m => {
                    if (m.journal && m.journal.currency_id) {
                        return {
                            id: m.id, item: m, name: m.name + ' (' + m.journal.currency_id[1] + ' ) '
                        }
                    } else {
                        return {
                            id: m.id, item: m, name: m.name
                        }
                    }
                })
                let {confirmed, payload: selectedItems} = await this.showPopup('PopUpSelectionBox', {
                    title: this.env._t('Select the Payment Method. If you need add Multi Payment Lines, please click [Close] button for go to Payment Screen to do it.'),
                    items: paymentMethods,
                    onlySelectOne: true,
                    buttonMaxSize: true
                });
                if (confirmed) {
                    const paymentMethodSelected = selectedItems.items[0]
                    if (!paymentMethodSelected) {
                        this.env.pos.alert_message({
                            title: this.env._t('Error'), body: this.env._t('Please select one Payment Method')
                        })
                        return this.autoAskPaymentMethod()
                    }
                    selectedOrder.add_paymentline(paymentMethodSelected);
                    const paymentline = selectedOrder.selected_paymentline;
                    paymentline.set_amount(0)
                    let {confirmed, payload: amount} = await this.showPopup('NumberPopup', {
                        title: this.env._t('How much Amount customer give ? Amount Total with taxes of Order is: ') + this.env.pos.format_currency(selectedOrder.get_total_with_tax()),
                        body: this.env._t('Full fill due Amount, you can click to Button Validate Order for finish Order and get a Receipt !'),
                        activeFullFill: true,
                        confirmFullFillButtonText: this.env._t('Full Fill Amount: ') + this.env.pos.format_currency(selectedOrder.get_due()),
                        fullFillAmount: selectedOrder.get_due()
                    })
                    if (confirmed) {
                        paymentline.set_amount(amount);
                        if (selectedOrder.get_due() <= 0) {
                            let {confirmed, payload: result} = await this.showPopup('ConfirmPopup', {
                                title: this.env._t('Refund Amount of Order : ') + this.env.pos.format_currency(-selectedOrder.get_due()),
                                body: this.env._t('Click Submit button for finish the Order and print Receipt ? (Shortcut key: [Enter])'),
                                cancelText: this.env._t('No. Close Popup'),
                                confirmText: this.env._t('Submit')
                            })
                            if (confirmed) {
                                this.showScreen('PaymentScreen', {
                                    autoValidateOrder: true, isShown: false,
                                })
                            } else {
                                this.showScreen('PaymentScreen')
                            }
                        } else {
                            this.showScreen('PaymentScreen')
                            return this.env.pos.alert_message({
                                title: this.env._t('Warning'),
                                body: this.env._t('Order not full fill Amount Total need to paid, Remaining Amount: ') + this.env.pos.format_currency(selectedOrder.get_due())
                            })
                        }
                    } else {
                        this.showScreen('PaymentScreen')
                    }
                } else {
                    this.showScreen('PaymentScreen')
                }
            } else {
                this.showScreen('PaymentScreen')
            }
        }

        async _actionAssignOrder() {
            var self = this;
            let selectedOrder = this.env.pos.get_order();
            if (selectedOrder.orderlines.length == 0) {
                return this.showPopup('ErrorPopup', {
                    title: this.env._t('Warning'), body: this.env._t('Your Order is blank Cart'),
                });
            }
            let hasValidMinMaxPrice = selectedOrder.isValidMinMaxPrice()
            if (!hasValidMinMaxPrice) {
                return true
            }
            if (!await this.validateMinimumPriceOfItemsInCart()) {
                return true
            }
            let sessions = await this.rpc({
                model: 'pos.session',
                method: 'search_read',
                domain: [['state', '=', 'opened'], ['config_id', 'in', this.env.pos.config.assign_orders_to_config_ids], ['id', '!=', this.env.pos.pos_session.id]],
                fields: ['name', 'user_id', 'config_id', 'start_at', 'id']
            }).then(function (sessions) {
                return sessions
            }, function (err) {
                return self.env.pos.query_backend_fail(err);
            })
            if (!sessions) {
                return this.showPopup('ErrorPopup', {
                    title: this.env._t('Error, Offline Mode'),
                    body: this.env._t('Your Odoo or Your Internet Offline, required online mode')
                })
            }
            if (sessions.length == 0) {
                return this.showPopup('ErrorPopup', {
                    title: this.env._t('Warning'),
                    body: this.env._t('Have not any POS Opened, please waiting it open the first'),
                });
            }
            const list = sessions.map(session => ({
                id: session.id, label: session.config_id[1], isSelected: false, item: session
            }))
            let {confirmed, payload: session} = await this.showPopup('SelectionPopup', {
                title: this.env._t('Select POS for Assign this Order'), list: list,
            });
            if (confirmed) {
                selectedOrder.pos_session_id = session.id
                selectedOrder.served_by = this.env.pos.user
                selectedOrder.served_by_id = this.env.pos.user.id
                selectedOrder.trigger('change', selectedOrder)
                let order_ids = await this.env.pos.push_single_order(selectedOrder, {
                    draft: true
                })
                const result_write = await this.rpc({
                    model: 'pos.order', method: 'write', args: [order_ids, {
                        state: 'quotation', session_id: session.id, user_id: this.env.pos.user.id,
                    }],
                }).then(function (result_write) {
                    return result_write
                }, function (err) {
                    return self.env.pos.query_backend_fail(err);
                })
                if (result_write) {
                    return this.showScreen('ReceiptScreen');
                }
            }
        }

        async _onClickPay() { // TODO Event : click-pay
            if (this.env.pos.config.replace_paid_button_to_assign) {
                return await this._actionAssignOrder()
            }
            let selectedOrder = this.env.pos.get_order();
            if (this.env.session.restaurant_order) {
                if (!this.env.pos.first_order_succeed) {
                    let {confirmed, payload: guest_total} = await this.showPopup('NumberPopup', {
                        title: this.env._t('How many guests on your table ?'), startingValue: 0
                    })
                    if (confirmed) {
                        selectedOrder.set_customer_count(parseInt(guest_total))
                    } else {
                        return this.showScreen('ProductScreen')
                    }
                }
                let {confirmed, payload: note} = await this.showPopup('TextAreaPopup', {
                    title: this.env._t('Have any notes for Cashiers/Kitchen Room of Restaurant ?'),
                })
                if (confirmed) {
                    if (note) {
                        selectedOrder.set_note(note)
                    }
                }
                if (selectedOrder.get_allow_sync()) {
                    let orderJson = selectedOrder.export_as_JSON()
                    orderJson.state = 'Waiting'
                    this.env.session.restaurant_order = false
                    this.env.pos.pos_bus.send_notification({
                        data: orderJson, action: 'new_qrcode_order', order_uid: selectedOrder.uid,
                    });
                    this.env.session.restaurant_order = true
                } else {
                    this.showPopup('ErrorPopup', {
                        title: this.env._t('Error'),
                        body: this.env._t('POS missed setting Sync Between Sessions. Please contact your admin resolve it')
                    })
                }
                this.env.pos.config.login_required = false // todo: no need login when place order more items
                this.env.pos.first_order_succeed = true
                this.env.pos.placed_order = selectedOrder
                return this.showTempScreen('RegisterScreen', {
                    selectedOrder: selectedOrder
                })
            } else {
                if (selectedOrder.orderlines.length == 0) {
                    return false
                }
                let hasValidMinMaxPrice = selectedOrder.isValidMinMaxPrice()
                if (!hasValidMinMaxPrice) {
                    return true
                }
                if (!await this.validateMinimumPriceOfItemsInCart()) {
                    return true
                }
                if (selectedOrder.is_to_invoice() && !selectedOrder.get_client()) {
                    const currentClient = selectedOrder.get_client();
                    const {
                        confirmed, payload: newClient
                    } = await this.showTempScreen('ClientListScreen', {
                        client: currentClient, body: this.env._t('Required Customer')
                    });
                    if (confirmed) {
                        selectedOrder.set_client(newClient);
                        selectedOrder.updatePricelist(newClient);
                    } else {
                        return this.showPopup('ErrorPopup', {
                            title: this.env._t('Error'), body: this.env._t('Order to Invoice, Required Set Customer'),
                        })
                    }
                }
                if (selectedOrder && selectedOrder.get_total_with_tax() == 0) {
                    this.env.pos.alert_message({
                        title: this.env._t('Warning !!!'),
                        body: this.env._t('Total Amount of Order is : ') + this.env.pos.format_currency(0)
                    })
                }
                if (!this.env.pos.config.allow_order_out_of_stock && this.env.pos.user.role != 'manager') {
                    const quantitiesByProduct = selectedOrder.product_quantity_by_product_id()
                    let isValidStockAllLines = true;
                    for (let n = 0; n < selectedOrder.orderlines.models.length; n++) {
                        let l = selectedOrder.orderlines.models[n];
                        let currentStockInCart = quantitiesByProduct[l.product.id]
                        if (l.product.type == 'product' && l.product.qty_available < currentStockInCart) {
                            isValidStockAllLines = false
                            this.env.pos.alert_message({
                                title: this.env._t('Error'),
                                body: l.product.display_name + this.env._t(' not enough for sale. Current stock on hand only have: ') + l.product.qty_available,
                                timer: 10000
                            })
                        }
                    }
                    if (!isValidStockAllLines) {
                        return false;
                    }
                }
                if (this.env.pos.retail_loyalty && selectedOrder.get_client()) {
                    let pointsSummary = selectedOrder.get_client_points()
                    if (pointsSummary['pos_loyalty_point'] >= 0 && pointsSummary['pos_loyalty_point'] < pointsSummary['redeem_point']) {
                        return this.showPopup('ErrorPopup', {
                            title: this.env._t('Error'),
                            body: this.env._t("You can not set Redeem points bigger than Customer's Points: ") + this.env.pos.format_currency_no_symbol(pointsSummary['pos_loyalty_point'])
                        })
                    }
                }
                if (this.env.pos.config.rounding_automatic) {
                    await this.roundingTotalAmount()
                }
            }
            return await super._onClickPay()
        }


        async _onClickCustomer() {
            await super._onClickCustomer()
        }

        async _clickProduct(event) {
            const self = this;
            let addProductBeforeSuper = false
            const selectedOrder = this.env.pos.get_order();
            const product = event.detail;
            if (this.env.pos.config.fullfill_lots && ['serial', 'lot'].includes(event.detail.tracking)) {
                let currentStockLocation = this.env.pos.get_source_stock_location()
                let quants = await this.rpc({
                    model: 'stock.quant',
                    method: 'search_read',
                    domain: [['product_id', '=', event.detail.id], ['available_quantity', '>', 0], ['location_id', '=', currentStockLocation.id]],
                    fields: ['lot_id', 'removal_date', 'inventory_date']
                })
                let lot_ids = []
                quants.forEach(l => lot_ids.push(l['lot_id'][0]))
                if (lot_ids.length > 0) {
                    let draftPackLotLines
                    let packLotLinesToEdit = await this.rpc({
                        model: 'stock.production.lot',
                        method: 'search_read',
                        domain: [['id', 'in', lot_ids], ['product_qty', '>', 0]],
                        fields: []
                    }).then(function (value) {
                        return value
                    }, function (error) {
                        self.env.pos.query_backend_fail(error)
                        return false
                    })
                    if (!packLotLinesToEdit) {
                        packLotLinesToEdit = this.env.pos.lots.filter(l => l.product_id && l.product_id[0] == product['id'])
                    } else {
                        packLotLinesToEdit = packLotLinesToEdit.sort(this.env.pos.sort_by('expiration_date', false, function (a) {
                            if (!a) {
                                a = 'N/A';
                            }
                            return a.toUpperCase()
                        }));
                    }
                    if (packLotLinesToEdit && packLotLinesToEdit.length) {
                        packLotLinesToEdit.forEach((l) => l.text = l.name);
                        const lotList = packLotLinesToEdit.map(l => ({
                            id: l.id,
                            item: l,
                            label: l.name + this.env._t(' Stock : ') + l.product_qty + this.env._t(', Expired Date: ') + (l.expiration_date || 'N/A')
                        }))
                        const selectedLot = [lotList[0]['item']]
                        const newPackLotLines = selectedLot
                            .filter(item => item.id)
                            .map(item => ({lot_name: item.name}));
                        const modifiedPackLotLines = selectedLot
                            .filter(item => !item.id)
                            .map(item => ({lot_name: item.text}));

                        draftPackLotLines = {modifiedPackLotLines, newPackLotLines};
                        if (newPackLotLines.length != 1) {
                            return this.env.pos.alert_message({
                                title: this.env._t('Error'),
                                body: this.env._t('Please select only Lot, and remove another Lots')
                            })
                        }
                        selectedOrder.add_product(event.detail, {
                            draftPackLotLines, price_extra: 0, quantity: 1,
                        });
                        addProductBeforeSuper = true
                        this.env.pos.alert_message({
                            title: this.env._t('Auto Assigned !'),
                            body: this.env._t('Assign Lot Serial/Number: ') + selectedLot[0]['display_name'] + this.env._t(' to selected Product')
                        })
                    }
                }
            }
            if (!addProductBeforeSuper) {
                await super._clickProduct(event)
            }
            const selectedLine = selectedOrder.get_selected_orderline();
            if (!selectedLine) {
                return this.env.pos.alert_message({
                    title: this.env._t('Error'), body: this.env._t('Line selected not found')
                })
                return false
            }
            if (product.multi_variant && this.env.pos.variant_by_product_tmpl_id[product.product_tmpl_id]) {
                let variants = this.env.pos.variant_by_product_tmpl_id[product.product_tmpl_id];
                let {confirmed, payload: results} = await this.showPopup('PopUpSelectionBox', {
                    title: this.env._t('Select Variants and Values'), items: variants
                })
                if (confirmed) {
                    let variantIds = results.items.map((i) => (i.id))
                    selectedLine.set_variants(variantIds);
                }
            }
            if (product.cross_selling && this.env.pos.cross_items_by_product_tmpl_id[product.product_tmpl_id]) {
                let crossItems = this.env.pos.cross_items_by_product_tmpl_id[product.product_tmpl_id];
                let {confirmed, payload: results} = await this.showPopup('PopUpSelectionBox', {
                    title: this.env._t('Suggest buy more Products with ' + product.display_name), items: crossItems
                })
                if (confirmed) {
                    let selectedCrossItems = results.items;
                    for (let index in selectedCrossItems) {
                        let item = selectedCrossItems[index];
                        let product = this.env.pos.db.get_product_by_id(item['product_id'][0]);
                        if (product) {
                            if (!product) {
                                continue
                            }
                            var price = item['list_price'];
                            var discount = 0;
                            if (item['discount_type'] == 'fixed') {
                                price = price - item['discount']
                            }
                            if (item['discount_type'] == 'percent') {
                                discount = item['discount']
                            }
                            selectedOrder.add_product(product, {
                                quantity: item['quantity'], price: price, merge: false,
                            });
                            if (discount > 0) {
                                selectedOrder.get_selected_orderline().set_discount(discount)
                            }
                        }
                    }
                }
            }
            if (product.sale_with_package && this.env.pos.packaging_by_product_id[product.id]) {
                var packagings = this.env.pos.packaging_by_product_id[product.id];
                let packList = packagings.map((p) => ({
                    id: p.id,
                    item: p,
                    label: p.name + this.env._t(' : have Contained quantity ') + p.qty + this.env._t(' with sale price ') + this.env.pos.format_currency(p.list_price)
                }))
                let {confirmed, payload: packSelected} = await this.showPopup('SelectionPopup', {
                    title: this.env._t('Select sale from Packaging'), list: packList
                })
                if (confirmed) {
                    selectedLine.packaging = packSelected;
                    selectedLine.set_quantity(packSelected.qty, 'set quantity manual via packing');
                    if (packSelected.list_price > 0) {
                        selectedLine.set_unit_price(packSelected.list_price / packSelected.qty);
                    }

                }
            }
            // kimanh : 12/07/2022 disable auto popup combo item
            // let combo_items = this.env.pos.combo_items.filter((c) => selectedLine.product.product_tmpl_id == c.product_combo_id[0])
            // if (combo_items && combo_items.length > 0) {
            //     selectedOrder.setBundlePackItems()
            // }
        }

        async roundingTotalAmount() {
            let selectedOrder = this.env.pos.get_order();
            let roundingMethod = this.env.pos.payment_methods.find((p) => p.journal && p.pos_method_type == 'rounding')
            if (!selectedOrder || !roundingMethod) {
                return this.env.pos.alert_message({
                    title: this.env._t('Warning'),
                    body: this.env._t('You active Rounding on POS Setting but your POS Payment Method missed add Payment Method [Rounding Amount]'),
                })
            }
            selectedOrder.paymentlines.models.forEach(function (p) {
                if (p.payment_method && p.payment_method.journal && p.payment_method.pos_method_type == 'rounding') {
                    selectedOrder.remove_paymentline(p)
                }
            })
            let due = selectedOrder.get_due();
            let amountRound = 0;
            if (this.env.pos.config.rounding_type == 'rounding_integer') {
                let decimal_amount = due - Math.floor(due);
                if (decimal_amount <= 0.25) {
                    amountRound = -decimal_amount
                } else if (decimal_amount > 0.25 && decimal_amount < 0.75) {
                    amountRound = 1 - decimal_amount - 0.5;
                    amountRound = 0.5 - decimal_amount;
                } else if (decimal_amount >= 0.75) {
                    amountRound = 1 - decimal_amount
                }
            } else if (this.env.pos.config.rounding_type == 'rounding_up_down') {
                let decimal_amount = due - Math.floor(due);
                if (decimal_amount < 0.5) {
                    amountRound = -decimal_amount
                } else {
                    amountRound = 1 - decimal_amount;
                }
            } else {
                let after_round = Math.round(due * Math.pow(10, roundingMethod.journal.decimal_rounding)) / Math.pow(10, roundingMethod.journal.decimal_rounding);
                amountRound = after_round - due;
            }
            if (amountRound == 0) {
                return true;
            } else {
                selectedOrder.add_paymentline(roundingMethod);
                let roundedPaymentLine = selectedOrder.selected_paymentline;
                roundedPaymentLine.amount = -amountRound // TODO: not call set_amount method, because we blocked change amount payment line is rounding at payment screen
                roundedPaymentLine.trigger('change', roundedPaymentLine)
            }
        }
    }

    Registries
        .Component
        .extend(ProductScreen, RetailProductScreen);

    return
    RetailProductScreen;
});
