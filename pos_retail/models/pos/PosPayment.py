from odoo import api, fields, models, _
from odoo.exceptions import ValidationError


class PosPayment(models.Model):
    _inherit = "pos.payment"

    last_order_id = fields.Many2one('pos.order', 'Last Order (before merge)')
    voucher_id = fields.Many2one('pos.voucher', 'Voucher')
    voucher_code = fields.Char('Voucher Code')
    pos_branch_id = fields.Many2one('pos.branch', string='Branch')
    ref = fields.Char('Ref')
    cheque_owner = fields.Char('Cheque Owner')
    cheque_bank_account = fields.Char('Cheque Bank Account')
    cheque_bank_id = fields.Many2one('res.bank', 'Cheque Bank')
    cheque_check_number = fields.Char('Cheque Check Number')
    cheque_card_name = fields.Char('Cheque Card Name')
    cheque_card_number = fields.Char('Cheque Card Number')
    cheque_card_type = fields.Char('Cheque Card Type')

    # @api.constrains('payment_method_id')
    # def _check_payment_method_id(self):
    #     for payment in self:
    #         payment_method_id = payment.payment_method_id.id if payment.payment_method_id else None
    #         payment_method_of_pos_config_ids = [p.id for p in payment.session_id.config_id.payment_method_ids]
    #         if payment_method_id not in payment_method_of_pos_config_ids:
    #             raise ValidationError(_('The payment method selected is not allowed in the config of the POS session.'))
    #         if payment.payment_method_id not in payment.session_id.config_id.payment_method_ids:
    #             raise ValidationError(_('The payment method selected is not allowed in the config of the POS session.'))

    @api.model
    def create(self, vals):
        if not vals.get('pos_branch_id'):
            vals.update({'pos_branch_id': self.env['pos.branch'].sudo().get_default_branch()})
        payment = super(PosPayment, self).create(vals)
        payment_method = payment.payment_method_id
        if payment_method.journal_id and payment_method.journal_id.pos_method_type != 'default':
            Credit = self.env['res.partner.credit']
            pos_method_type = payment_method.journal_id.pos_method_type
            if pos_method_type == 'voucher' and payment.voucher_id:
                if payment.voucher_id.apply_type == 'percent':
                    payment.voucher_id.write({'state': 'used', 'use_date': fields.Datetime.now()})
                    self.env['pos.voucher.use.history'].create({
                        'pos_order_id': payment.pos_order_id.id,
                        'payment_id': payment.id,
                        'voucher_id': payment.voucher_id.id,
                        'value': payment.amount,
                        'used_date': fields.Datetime.now(),
                        'cashier_id': self.env.user.id
                    })
                else:
                    amount = payment.amount
                    if (payment.voucher_id.value - amount) <= 0:
                        payment.voucher_id.write({
                            'state': 'used',
                            'use_date': fields.Datetime.now(),
                            'value': 0,
                        })
                    else:
                        payment.voucher_id.write({'value': (payment.voucher_id.value - amount)})
                    self.env['pos.voucher.use.history'].create({
                        'pos_order_id': payment.pos_order_id.id,
                        'payment_id': payment.id,
                        'cashier_id': self.env.user.id,
                        'voucher_id': payment.voucher_id.id,
                        'value': payment.amount,
                        'used_date': fields.Datetime.now()
                    })
            if pos_method_type == 'credit' and payment.pos_order_id.partner_id:
                Credit.create({
                    'name': payment.pos_order_id.name,
                    'type': 'redeem',
                    'amount': payment.amount,
                    'pos_order_id': payment.pos_order_id.id,
                    'partner_id': payment.pos_order_id.partner_id.id,
                })
        return payment
