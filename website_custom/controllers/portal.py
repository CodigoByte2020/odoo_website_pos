from odoo.addons.portal.controllers.portal import CustomerPortal, pager, get_records_pager
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
        values['users_quantity'] = request.env['res.users'].search_count([])
        print(f'_prepare_portal_layout_values: {values}')
        return values

    # Especifica las rutas que la función manejará.
    # En este caso, la función manejará las solicitudes para las rutas /users y /users/page/<int:page>.
    # El segmento <int:pag> indica que se espera un entero en la posición page en la segunda ruta.
    @http.route(['/users', '/users/page/<int:page>'], type='http', website=True)
    # El parámetro page de la función almacena el argumento page de la ruta, sino definimos este parámetro,
    # el argumento de la ruta se guarda en **kwargs.
    # El argumento de la ruta y el parámetro de la función deben tener el mismo nombre.
    def users_list_view(self, page=1, **kwargs):
        print('HERE')
        step = 3
        model_res_users = request.env['res.users']
        user_quantity = model_res_users.search_count([])
        page_detail = pager(url='/users', total=user_quantity, page=page, step=step)
        users = model_res_users.search([], limit=step, offset=page_detail['offset'])
        values = {
            'users': users,
            'page_name': 'users_list_view',
            'pager': page_detail
        }
        return request.render('website_custom.users_list_view', values)

    # @http.route(['/users/<int:user_id>'], type='http', website=True)
    @http.route(['/users/<model("res.users"):user>'], type='http', website=True)
    def users_form_view(self, user, **kwargs):
        # user = request.env['res.users'].sudo().browse(user_id) Si recibimos <int:user_id> debemos buscar el usuario.
        user_ids = request.env['res.users'].search([]).ids
        user_index = user_ids.index(user.id)
        # Tener cuidado al mandar el id incorrecto a la siguiente llamada del controlador.
        values = {
            'user': user,
            'page_name': 'users_form_view',
            'prev_record': user_index != 0 and f'/users/{user_ids[user_index - 1]}',
            'next_record': user_index < len(user_ids) - 1 and f'/users/{user_ids[user_index + 1]}'
        }
        return request.render('website_custom.users_form_view', values)
