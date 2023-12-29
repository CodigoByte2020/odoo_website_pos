# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import fields, models
import logging

_logger = logging.getLogger(__name__)


class ReportPosOrder(models.Model):
    _inherit = 'report.pos.order'

    pos_branch_id = fields.Many2one('pos.branch', 'Branch')
    seller_id = fields.Many2one('res.users', 'User/Staff')
    analytic_account_id = fields.Many2one(
        'account.analytic.account',
        'Analytic Account'
    )
    table_id = fields.Many2one('restaurant.table', 'Table')
    floor_id = fields.Many2one('restaurant.floor', 'Floor')
    payment_method_id = fields.Many2one('pos.payment.method', 'Payment Method')
    payment_total = fields.Float('Payment Total')

    def _select(self):
        select = super(ReportPosOrder, self)._select() + ",l.pos_branch_id AS pos_branch_id," \
                                                         "l.user_id AS seller_id," \
                                                         "l.analytic_account_id AS analytic_account_id," \
                                                         "s.table_id AS table_id," \
                                                         "rt.floor_id AS floor_id," \
                                                         "ppm.id AS payment_method_id," \
                                                         "SUM(ppt.amount) AS payment_total"
        return select

    def _group_by(self):
        group_by = super(ReportPosOrder, self)._group_by() + ",l.pos_branch_id," \
                                                             "l.user_id," \
                                                             "l.analytic_account_id," \
                                                             "s.table_id," \
                                                             "rt.floor_id," \
                                                             "ppm.id"
        return group_by

    def _from(self):
        from_table = super(ReportPosOrder, self)._from() + " LEFT JOIN restaurant_table rt ON (s.table_id=rt.id)" \
                                                           " LEFT JOIN restaurant_floor rf ON (rt.floor_id=rf.id)" \
                                                           " LEFT JOIN pos_payment ppt ON (s.id=ppt.pos_order_id)" \
                                                           " LEFT JOIN pos_payment_method ppm ON (ppm.id=ppt.payment_method_id)"
        return from_table
