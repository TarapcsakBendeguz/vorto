/**
 * Copyright (c) 2015-2018 Bosch Software Innovations GmbH and others.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * and Eclipse Distribution License v1.0 which accompany this distribution.
 *
 * The Eclipse Public License is available at
 * http://www.eclipse.org/legal/epl-v10.html
 * The Eclipse Distribution License is available at
 * http://www.eclipse.org/org/documents/edl-v10.php.
 *
 * Contributors:
 * Bosch Software Innovations GmbH - Please refer to git log
 */
package org.eclipse.vorto.repository.workflow.model;

import org.eclipse.vorto.repository.api.ModelInfo;
import org.eclipse.vorto.repository.workflow.InvalidInputException;

public interface IWorkflowValidator {

	/**
	 * validates the given model for the currently executed action
	 * @param model
	 * @param currentAction
	 * @throws InvalidInputException
	 */
	void validate(ModelInfo model, IAction currentAction) throws InvalidInputException;
}
