from odoo.addons.portal.controllers.portal import CustomerPortal
from odoo.http import request

from odoo import http


class AppWebCustomerPortal(CustomerPortal):

    # def _prepare_portal_layout_values(self):
    #     values = super(AppWebCustomerPortal, self)._prepare_portal_layout_values()
    #     print(f'_prepare_portal_layout_values: {values}')
    #     counters = self._prepare_home_portal_values(counters=None)
    #     return values

    def _prepare_home_portal_values(self, counters):
        values = super(AppWebCustomerPortal, self)._prepare_home_portal_values(counters)
        print(f'_prepare_portal_layout_values: {values}')
        values['users_quantity'] = request.env['res.users'].sudo().search_count([])
        print(f'_prepare_portal_layout_values: {values}')
        return values

    @http.route(['/users'], type='http', website=True)
    def users_list_view(self, **kwargs):
        print('HERE')
        users = request.env['res.users'].sudo().search([])
        values = {
            'users': users,
            'page_name': 'users_list_view'
        }
        return request.render('website_custom.users_list_view', values)

    # @http.route(['/users/<int:user_id>'], type='http', website=True)
    @http.route(['/users/<model("res.users"):user_id>'], type='http', website=True)
    def users_form_view(self, user_id, **kwargs):
        # user = request.env['res.users'].sudo().browse(user_id) Si recibimos <int:user_id> debemos buscar el usuario.
        values = {
            'user': user_id,  # user_id: res.users(1)
            'page_name': 'users_form_view'
        }
        return request.render('website_custom.users_form_view', values)
