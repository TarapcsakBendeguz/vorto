/**
 * Copyright (c) 2020 Contributors to the Eclipse Foundation
 *
 * See the NOTICE file(s) distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License 2.0 which is available at
 * https://www.eclipse.org/legal/epl-2.0
 *
 * SPDX-License-Identifier: EPL-2.0
 */
package
/*
 * generated by Xtext
 */
org.eclipse.vorto.editor.datatype

import org.eclipse.vorto.editor.datatype.converter.DatatypeValueConverter
import org.eclipse.vorto.editor.datatype.formatting.DatatypeFormatter
import org.eclipse.vorto.editor.datatype.scoping.DatatypeScopeProvider
import org.eclipse.xtext.conversion.IValueConverterService
import org.eclipse.xtext.naming.IQualifiedNameProvider
import org.eclipse.xtext.scoping.IScopeProvider

/** 
 * Use this class to register components to be used at runtime / without the
 * Equinox extension registry.
 */
class DatatypeRuntimeModule extends AbstractDatatypeRuntimeModule {
	override Class<? extends IScopeProvider> bindIScopeProvider() {
		return DatatypeScopeProvider
	}

	override Class<? extends IQualifiedNameProvider> bindIQualifiedNameProvider() {
		return QualifiedNameWithVersionProvider
	}

	override Class<? extends IValueConverterService> bindIValueConverterService() {
		return DatatypeValueConverter
	}
	
	override bindIFormatter() {
		return DatatypeFormatter
	}
}
